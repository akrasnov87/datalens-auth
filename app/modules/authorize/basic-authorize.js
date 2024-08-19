/**
 * @file modules/authorize/basic-authorize.js
 * @project skr-rpc-service
 * @author Александр
 * @todo базовый механизм авторизации. Логин и пароль шифруются как base64 строка
 */

var authorizeDb = require('./authorization-db');
var utils = require('../utils');
var db = require('../dbcontext');
var Console = require('../log');
const NodeCache = require("node-cache");
const args = require('../conf')();
const process = require('process');
var pkg = require('../../package.json');

const LOCK_TIME = 5;
const firstCache = new NodeCache({ stdTTL: 60, checkperiod: 30, deleteOnExpire: true });
const disableCache = new NodeCache({ stdTTL: LOCK_TIME * 60, checkperiod: 60, deleteOnExpire: true }); // блокировка пользователей на 5 минут
const AUTH_COUNT = 5; // количество попыток авторизации

/**
 * установка текущего пользователя
 * @param {boolean} skip false - пользователь не авторизован и выдавать сразу код 401
 * @returns {function}
 */
exports.user = function (skip) {
    skip = skip == undefined ? false : skip;
    return function (req, res, next) {
        var data = req.headers[utils.getAuthorizationHeader()] || req.query[utils.getAuthorizationHeader()];
        if (data) {
            var userInfo = [];
            if(data.indexOf('OpenToken ') == 0) {
                if(args.debug) {
                    Console.debug(`OpenToken - авторизация`, 'middleware', null, null);
                }
                var token = data.replace('OpenToken ', '');
                userInfo = token.split(':');
            } else {
                var token = data.replace('Token ', '');
                userInfo = Buffer.from(token, 'base64').toString().split(':');
            }
            var UserName = userInfo[0];
            var Password = args.auth_key_mode ? null : userInfo[1];
            var Key = args.auth_key_mode ? userInfo[1] : userInfo[2];

            var ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
            authorizeDb.getUser(UserName, Password, ip, Key, req.headers['user-agent'], args.auth_key_mode, false, false, function (user) {

                res.user = user;
                res.isAuthorize = user.id != -1;
                res.isMaster = user.c_claims.indexOf(args.primary_role) >= 0;
                res.isAdmin = user.c_claims.indexOf(args.secodary_role) >= 0;
                res.user.isMaster = res.isMaster;
                res.user.isAdmin = res.isAdmin;
                res.user.isEmbed = UserName == 'datalens_embedding';
                
                if (!res.isAuthorize) {
                    if(args.debug) {
                        Console.debug(`Некорректный заголовок авторизации ${data}`, 'middleware');
                    }

                    if (skip == true) {
                        next();
                    } else { // если пользователь не авторизован, то выдавать сразу код 401
                        res.status(401).json({
                            meta: {
                                success: false,
                                host: process.pid
                            }
                        });
                    }
                } else {
                    next();
                }
            });
        } else {
            if(args.debug) {
                Console.debug(`Заголовок авторизации не передан. status code = ${skip == true ? 200 : 401}`, 'middleware');
            }
            if (skip == true) {
                res.user = Object.assign({
                    id: -1,
                    c_claims: '',
                    c_login: 'none',
                    n_key: null
                });
                res.isAuthorize = false;
                res.isMaster = false;

                next();
            } else {
                res.status(401).json({
                    meta: {
                        success: false,
                        host: process.pid
                    }
                });
            }
        }
    }
}

/**
 * 
 * @example
 * POST ~/auth
 * 
 * Body x-www-form-urlencoded
 * {
 *      UserName: string - Логин 
 *      Password: string - Пароль
 *      Version: string - версия устройства
 *      Key: string - ключ авторизации
 * }
 * 
 * @todo Статусы;
 * 200 - пользователь авторизован;
 * 401 - пользователь не авторизован;
 * 401 - логин заблокирован из-за частых запросов на авторизацию;
 */
exports.authorize = function (req, res, next) {
    var UserName = req.body.UserName;
    var Password = req.body.Password;
    var Version = req.body.Version;
    var Key = req.body.Key;

    var disabled = disableCache.has(UserName) ? disableCache.get(UserName) : null;

    if(disabled) {
        disableCache.set(UserName, {});

        Console.debug(`Пользователь ${UserName} заблокирован на ${LOCK_TIME} минут.`, 'AUTH');

        db.func('core', 'sf_users_by_login_with_alias', null).Select({ params: [UserName, false]}, function (data) {
            var user = data.result.records[0];
            user.id = parseInt(user.id);
            user.lock_time = LOCK_TIME;
            
            return res.status(401).json({
                meta: {
                    success: false,
                    msg: `Логин ${UserName} заблокирован на ${LOCK_TIME} минут.`,
                    host: process.pid
                }
            });
        });
    } else {
        var ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
        authorizeDb.getUser(UserName, Password, ip, null, req.headers['user-agent'], args.auth_key_mode, true, true, function (user) {

            if (user.id == -1) {

                var result = firstCache.has(UserName) ? firstCache.get(UserName) : {
                    count: 0
                };
                result.count++;
                
                firstCache.set(UserName, result);
            
                if(result.count > AUTH_COUNT) {
                    disableCache.set(UserName, {});
                }

                Console.debug(`Пользователь ${UserName} не авторизован (${result.count}/${AUTH_COUNT}).`, 'AUTH');

                return res.status(401).json({
                    meta: {
                        success: false,
                        msg: 'Пользователь не авторизован.',
                        host: process.pid
                    }
                });
            } else {
                // обновляем дату входа
                var ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
                Key = (Key == '' || Key == 'null') ? null : Key;
                db.provider.db().query('select * from core.sf_update_auth($1, $2, $3, $4, $5, $6)', [Version, user.id, Key, ip, req.headers['user-agent'], args.auth_key_mode], function(err, rows) { 

                    if(err) {
                        return res.status(401).json({
                            meta: {
                                success: false,
                                msg: err.message,
                                host: process.pid
                            }
                        });
                    }

                    var newKey = rows.rows[0].sf_update_auth;

                    if((newKey != null && newKey < 0) || args.auth_key_mode && !Key && newKey != null && newKey < 0) {
                        newKey = newKey < 0 ? newKey * -1 : newKey;

                        return res.status(401).json({
                            meta: {
                                success: false,
                                msg: 'not equal key',
                                host: process.pid
                            }
                        });
                    }

                    Console.debug(`Пользователь ${UserName} выполнил авторизацию.`, 'AUTH', user.id, user.c_claims);

                    newKey = newKey < 0 ? newKey * -1 : newKey;

                    res.json({
                        token: args.auth_key_mode ? Buffer.from(UserName + ':' + newKey).toString('base64') : Buffer.from(UserName + ':' + Password).toString('base64'),
                        user: {
                            id: user.id,
                            login: user.c_login,
                            claims: user.c_claims,
                            date: new Date(),
                            n_key: newKey,
                            port: process.pid,
                            version: pkg.version,
                            oidc: user.b_oidc
                        },
                        projectId: user.c_project_name || args.application_name
                    });
                });
            }
        });
    }
}

/**
 * 
 * @example
 * POST ~/oidc/auth
 * 
 * Body x-www-form-urlencoded
 * {
 *      UserName: string - Логин 
 *      Token: string - Токен
 * }
 * 
 * @todo Статусы;
 * 200 - пользователь авторизован;
 * 401 - пользователь не авторизован;
 */
exports.authorizeOIDC = function (req, res, next) {
    var UserName = req.body.UserName;
    var Token = req.body.Token;
    var Data = req.body.Data ? JSON.parse(Buffer.from(req.body.Data, 'base64').toString()) : null;
    var Key = 'null';
    var Version = 'null';

    var disabled = disableCache.has(UserName) ? disableCache.get(UserName) : null;

    if(disabled) {
        disableCache.set(UserName, {});

        Console.debug(`Пользователь ${UserName} заблокирован на ${LOCK_TIME} минут.`, 'AUTH');

        db.func('core', 'sf_users_by_login_with_alias', null).Select({ params: [UserName, false]}, function (data) {
            var user = data.result.records[0];
            user.id = parseInt(user.id);
            user.lock_time = LOCK_TIME;
            
            return res.status(401).json({
                meta: {
                    success: false,
                    msg: `Логин ${UserName} заблокирован на ${LOCK_TIME} минут.`,
                    host: process.pid
                }
            });
        });
    } else {
        db.func('core', 'sf_users_by_login_with_alias', null).Select({ params: [UserName, false]}, function (data) {
            var user = data.result.records[0];
            if(user) {
                authorizeDb.passwordReset(UserName, Token, function() {
                    auth();
                });
            } else {
                // создание пользователя
                db.func('core', 'sf_create_oidc_user', null).Query({ params: [UserName, Token, Data]}, function (data) {
                    auth();
                });
            }
        });
    }

    function auth() {
        var ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
        authorizeDb.getUser(UserName, Token, ip, null, req.headers['user-agent'], args.auth_key_mode, true, true, function (user) {

            if (user.id == -1) {

                var result = firstCache.has(UserName) ? firstCache.get(UserName) : {
                    count: 0
                };
                result.count++;
                
                firstCache.set(UserName, result);
            
                if(result.count > AUTH_COUNT) {
                    disableCache.set(UserName, {});
                }

                Console.debug(`Пользователь ${UserName} не авторизован (${result.count}/${AUTH_COUNT}).`, 'AUTH');

                return res.status(401).json({
                    meta: {
                        success: false,
                        msg: 'Пользователь не авторизован.',
                        host: process.pid
                    }
                });
            } else {
                // обновляем дату входа
                var ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
                Key = (Key == '' || Key == 'null') ? null : Key;
                db.provider.db().query('select * from core.sf_update_auth($1, $2, $3, $4, $5, $6)', [Version, user.id, Key, ip, req.headers['user-agent'], args.auth_key_mode], function(err, rows) { 

                    if(err) {
                        return res.status(401).json({
                            meta: {
                                success: false,
                                msg: err.message,
                                host: process.pid
                            }
                        });
                    }

                    var newKey = rows.rows[0].sf_update_auth;

                    if((newKey != null && newKey < 0) || args.auth_key_mode && !Key && newKey != null && newKey < 0) {
                        newKey = newKey < 0 ? newKey * -1 : newKey;

                        return res.status(401).json({
                            meta: {
                                success: false,
                                msg: 'not equal key',
                                host: process.pid
                            }
                        });
                    }

                    Console.debug(`Пользователь ${UserName} выполнил авторизацию.`, 'AUTH', user.id, user.c_claims);

                    newKey = newKey < 0 ? newKey * -1 : newKey;

                    res.json({
                        token: args.auth_key_mode ? Buffer.from(UserName + ':' + newKey).toString('base64') : Buffer.from(UserName + ':' + Token).toString('base64'),
                        user: {
                            id: user.id,
                            login: user.c_login,
                            claims: user.c_claims,
                            date: new Date(),
                            n_key: newKey,
                            port: process.pid,
                            version: pkg.version
                        },
                        projectId: user.c_project_name || args.application_name
                    });
                });
            }
        });
    }
}