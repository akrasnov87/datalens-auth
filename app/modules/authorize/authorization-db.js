/**
 * @file modules/authorize/authorization-db.js
 * @project skr-rpc-service
 * @author Александр
 */

var db = require('../dbcontext');
var args = require('../conf')();
const NodeCache = require("node-cache");
const request = require('request')

/**
 * период времени для хранение ключа в кэш (секунды)
 * @type {number}
 * @default 60
 */
var user_auth_expire = args.user_auth_expire || 5;
var user_checkperiod = args.user_checkperiod || 3;

const myCache = new NodeCache({ stdTTL: user_auth_expire, checkperiod: user_checkperiod, deleteOnExpire: true });

/**
 * возвращается информация о пользователе
 * @param {string} userName имя пользователя
 * @param {string} password пароль пользователя
 * @param {function} callback функция обратного вызова
 * @example
 * getUser('user', 'password', function(user, original) {
 *      if(user.id > 0) {
 *          // пользователь авторизован
 *      }
 *      // в переменной original храниться информация о пользователе, если она есть в БД
 * });
 */
exports.getUser = function (login, password, ip, key, name, isKeyMode, disableCache, without_alias, callback) {
    key = (key == "" || key == "null") ? null : key
    var cacheKey = args.auth_key_mode ?  (key == null ? null : key.toString()) : login;

    if (typeof callback == 'function') {
        var user = {
            id: -1,
            c_claims: ''
        };
        
        var result = myCache.has(cacheKey) ? myCache.get(cacheKey) : null;

        // пользователь ранее был авторизован и информация в кэше о нем есть
        if(result && !disableCache) {
            myCache.set(cacheKey, result);
            callback(result);
        } else {
            if(args.budibase_uri && login.indexOf('@') > 0 && password) {
                request.post(args.budibase_uri, { json: { username: login, password: password, "permissionInfo": true } }, (error, response, body) => {
                    if(error || body.status == args.budibase_unauthorized_status) {
                        callback(user, null);
                    } else {
                        user = {
                            _id: body._id,
                            c_login: body.username,
                            c_claims: '.' + body.groups.map((it, idx)=>(it._id)).join('.') + '.',
                            b_disabled: body.status != 'active',
                            c_email: body.username,
                            c_claims_name: '.' + body.groups.map((it, idx)=>(it.name)).join('.') + '.'
                        };

                        db.func('core', 'sf_registry_user', null).Query({ params: [user, '']}, function(data) { 
                            user.id = parseInt(data.meta.success ? data.result.records[0].sf_registry_user : -1);

                            if (user.id > 0) {
                                db.func('core', 'sf_users', null).Select({ params: [user.id]}, function (data) {
                                    var item = data.result.records[0];
                                    item.id = parseInt(item.id);
                                    if(cacheKey != null && !disableCache) {
                                        myCache.set(cacheKey, item);
                                    }
                                    callback(item);
                                });
                            } else {
                                callback(user, null);
                            }
                        });
                    }
                });
            } else {
                db.func('core', 'sf_verify_user', null).Query({ params:[login, password, ip, name, key, isKeyMode]}, function(data) {
                    var f_user = parseInt(data.meta.success ? data.result.records[0].sf_verify_user : -1);
                    if (f_user > 0) {
                        db.func('core', without_alias ? 'sf_users_with_alias' : 'sf_users', null).Select({ params: (without_alias ? [f_user, false] : [f_user])}, function (data) {
                            var item = data.result.records[0];
                            item.id = parseInt(item.id);

                            if(cacheKey != null && !disableCache) {
                                myCache.set(cacheKey, item);
                            }

                            callback(item);
                        });
                    } else {
                        callback(user, null);
                    }
                });
            }
        }
    }
}

/**
 * Сброс пароля. Будет сгенерирован новый пароль
 * @param {string} login логин
 * @param {string} newPassword новый пароль
 * @param {function} callback функция обратного вызова
 */
exports.passwordReset = function (login, newPassword, callback) {
    if (typeof callback == 'function') {
        db.func('core', 'sf_reset_pwd', null).Select({ params: [login, newPassword] }, (data) => {
            var email = data.meta.success ? data.result.records[0].s : false;
            callback(email);
        });
    }
}