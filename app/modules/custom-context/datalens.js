/**
 * @file modules/custom-context/shell.js
 * @project skr-rpc-service
 * @author Александр
 */

/**
 * объект для формирования ответа
 */
var result_layout = require('mobnius-pg-dbcontext/modules/result-layout');
var db = require('../dbcontext');
var Console = require('../log');

var accessFilter = require('../rpc/modules/access-filter');
var accessCacher = require('../rpc/modules/accesses-cacher');
const args = require('../conf')();
var authorizeDb = require('../authorize/authorization-db');
var utils = require('../utils');

/**
 * Объект с набором RPC функций
 */
exports.datalens = function (session) {

    return {

        /**
         * Текущий пользователь
         * @param {*} data 
         * @param {*} callback 
         */
        currentUser: function(data, callback) {
            callback(result_layout.ok([session.user]));
        },

        /**
         * Получение информации для Datalens (графики)
         * @param {*} data 
         * @param {*} callback 
         * 
         * @example
         * [{ action: "shell", method: "datalens", data: [{ }], type: "rpc", tid: 0 }]
         * 
         */
        authorization: function (data, callback) {
            var url = require('url');
            Console.debug(JSON.stringify(data), 'DATALENS', session.user.id, session.user.c_claims);
            var schemas = global.schemas;
            var urlData = url.parse(data.url).pathname.split('/');

            switch(data.method.toUpperCase()) {
                case 'GET':
                    data.method = 'Select';
                    break;
                case 'POST':
                    data.method = 'Add';
                    break;   
                case 'PUT':
                    data.method = 'Update';
                    break; 
                case 'DELETE':
                    data.method = 'Delete';
                    break; 
            }

            data.action = urlData[urlData.length - 1];
            delete data.url;
            delete data.rawHeaders;

            accessFilter.filter(session.user.isEmbed ? 'DL.PREVIEW' : 'DL', data, session.user.id, schemas, function (err, rows) {
                if (rows) {
                    // тут нужно создать токен из user devices

                    callback(result_layout.ok([{ 'statusCode': 200, 'token': session.request.headers['rpc-authorization'], user_id: session.user.id, claims: session.user.c_claims, projectId: args.application_name, login: session.user.c_login, root: session.user.c_claims.indexOf(args.primary_role) >= 0 }]));
                } else {
                    Console.error(`Пользователь не имеет прав на выполнение операции: ${JSON.stringify(data)}`, 'DATALENS_ACCESS', session.user.id, session.user.c_claims);
                    
                    callback(result_layout.ok([{ 'statusCode': 401 }]));
                }
            });
        },

        /**
         * Права доступа
         * @param {*} data 
         * @param {*} callback 
         * 
         * @example
         * [{ action: "shell", method: "permissions", data: [{ }], type: "rpc", tid: 0 }]
         */
        permissions: function(data, callback) {
            if(data.id || data.title || data.entryId) {
                accessFilter.permissions(session.user, data.id || data.title || data.entryId, function (permissions) {
                    if (permissions) {
                        callback(result_layout.ok([permissions]));
                    } else {
                        Console.error(`Пользователь не имеет прав на выполнение операции: ${JSON.stringify(data)}`, 'DATALENS_PERMISSIONS', session.user.id, session.user.c_claims);
                        
                        callback(result_layout.ok([{ hidden: true }]));
                    }
                });
            } else {
                Console.error(`Идентифиактор объекта не передан: ${JSON.stringify(data)}`, 'DATALENS_PERMISSIONS', session.user.id, session.user.c_claims);
                        
                callback(result_layout.ok([{ hidden: true }]));
            }
        },

        /**
         * Внедрение ссылки на шару
         * @param {*} data 
         * @param {*} callback 
         * 
         * @example
         * [{ action: "shell", method: "embeds", data: [{ }], type: "rpc", tid: 0 }]
         */
        embed: function(data, callback) {
            db.provider.db().query('select * from core.sf_create_embed($1, $2, $3, $4)', [session.request.headers['rpc-authorization'], data.entryId, session.user.c_login, data.reject || false], function(err, rows) { 
                if(err) {
                    callback(result_layout.ok([{ 'statusCode': 500, 'message': err.toString() }])); 
                } else {
                    var decode_id = rows.rows.length == 1 ? rows.rows[0].decode_id : null;
                    if(decode_id) {
                        callback(result_layout.ok([{ 'statusCode': 200, 'embed': Buffer.from(`datalens_embedding:${decode_id}`).toString('base64') }]));
                    } else {
                        callback(result_layout.ok([{ 'statusCode': 500, 'message': 'decode_id не найден.' }]));
                    }
                }
            });
        },

        /**
         * Список ролей
         * @param {*} data 
         * @param {*} callback 
         * 
         * @example
         * [{ "action": "datalens", "method": "roles", "data": [{ }], "type": "rpc", "tid": 0 }]
         */
        roles: function(data, callback) {
            db.provider.db().query(`
            select  r.id AS role_id, 
                    r.c_name AS name, 
                    r.c_description AS description, 
                    r.n_weight AS weight,
                    r.b_base as isBase 
            from core.pd_roles AS r
            ORDER BY r.c_name`, 
            null, function(err, rows) { 
                if(err) {
                    callback(result_layout.error(err)); 
                } else {
                    callback(result_layout.ok(rows.rows.filter((i) => { return args.primary_role.indexOf(i.name) < 0; })));
                }
            });
        },

        /**
         * Список разрешений
         * @param {*} data 
         * @param {*} callback 
         * 
         * @example
         * [{ "action": "datalens", "method": "accesses", "data": [{ "id": "w203ynnjgfkck" }], "type": "rpc", "tid": 0 }]
         */
        accesses: function(data, callback) {
            db.provider.db().query(`
            SELECT 	pa.f_role AS role_id,
                    CASE WHEN pa.c_function ILIKE '%.Select' OR pa.c_function = 'DL.*' THEN true ELSE false END AS "select",
                    CASE WHEN pa.c_function ILIKE '%.Add' OR pa.c_function = 'DL.*' THEN true ELSE false END AS "add",
                    CASE WHEN pa.c_function ILIKE '%.Update' OR pa.c_function = 'DL.*' THEN true ELSE false END AS "update",
                    CASE WHEN pa.c_function ILIKE '%.Delete' OR pa.c_function = 'DL.*' THEN true ELSE false END AS "delete"
            FROM core.pd_accesses as pa
            WHERE pa.c_function ILIKE ('DL.' || $1 || '.%') OR pa.c_function = 'DL.*';`, 
            [data.id], function(err, rows) { 
                if(err) {
                    callback(result_layout.error(err)); 
                } else {
                    callback(result_layout.ok(rows.rows));
                }
            });
        },

        /**
         * Обновление прав доступа
         * @param {*} data 
         * @param {*} callback 
         * 
         * @example
         * [{ "action": "datalens", "method": "updateAccesses", "data": [{ "id": "w203ynnjgfkck", "role_id": -1, "select": true, "add": true, "update": true, "delete": true, "destroy": true }], "type": "rpc", "tid": 0 }]
         */
        updateAccesses: function(data, callback) {
            var errors = [];

            if(!(session.user.isMaster || session.user.isAdmin)) {
                return callback(result_layout.error(`Недостаточно прав.`));
            }

            function nextDestroy(item, _callback) {
                // удаление записи
                if(item.method) {
                    db.provider.db().query(`
                    DELETE FROM core.pd_accesses as pa
                    WHERE pa.c_function ILIKE ('DL.' || $1 || '.' || $2) AND ${item.role_id == undefined ? "pa.f_user" : "pa.f_role"} = $3;`, 
                    [item.id, item.method, item.role_id == undefined ? session.user.id : item.role_id], function(err, rows) { 
                        if(err) {
                            errors.push(err.toString());
                            _callback(err, null); 
                        } else {
                            _callback(null, []);
                        }
                    });
                } else {
                    _callback(null, []);
                }
            }

            function nextInsert(item, _callback) {
                // удаление записи
                if(item.method) {
                    db.provider.db().query(`
                    INSERT INTO core.pd_accesses(${item.role_id == undefined ? "f_user" : "f_role"}, c_function, dl_id)
                    VALUES($3, 'DL.' || $1 || '.' || $2, $4);`, 
                    [item.id, item.method, item.role_id == undefined ? session.user.id : item.role_id, item.dl_id], function(err, rows) { 
                        if(err) {
                            errors.push(err.toString());
                            _callback(err, null); 
                        } else {
                            _callback(null, []);
                        }
                    });
                } else {
                    _callback(null, []);
                }
            }

            data.select = data.select == "true" || data.select == true;
            data.add = data.add == "true" || data.add == true;
            data.update = data.update == "true" || data.update == true;
            data.delete = data.delete == "true" || data.delete == true;
            data.destroy = data.destroy == "true" || data.destroy == true;
            data['*'] = data['*'] == "true" || data['*'] == true;

            var next = (data.destroy ? nextDestroy : nextInsert);

            //next({dl: data.dl, method: data.destroy ? "%" : '*', role_id: data.role_id }, (err, rows) => {
            next({id: data.id, dl_id: data.__id, method: (data['*'] ? (data.destroy ? "%" : '*') : (data.destroy ? "%" : null)), role_id: data.role_id }, (err, rows) => {
                nextInsert({id: data.id, dl_id: data.__id, method: data.select ? "Select" : null, role_id: data.role_id }, (err, rows) => {
                    nextInsert({id: data.id, dl_id: data.__id, method: data.add ? "Add" : null, role_id: data.role_id }, (err, rows) => {
                        nextInsert({id: data.id, dl_id: data.__id, method: data.update ? "Update" : null, role_id: data.role_id }, (err, rows) => {
                            nextInsert({id: data.id, dl_id: data.__id, method: data.delete ? "Delete" : null, role_id: data.role_id }, (err, rows) => {
                                if(errors.length > 0) {
                                    callback(result_layout.error(errors.join(', ')));
                                } else {
                                    accessCacher.clearAccesses(null);
                                    callback(result_layout.ok([]));
                                }
                            })
                        })
                    })
                })
            })
        },

        create_user: function(data, callback) {
            if(!session.user.isMaster) {
                return callback(result_layout.error(`Нет роли ${args.primary_role}`));
            }

            data = utils.normal_values(data);

            if(!data.c_password || !data.c_login || !data.c_claims || data.c_claims.length == 0) {
                return callback(result_layout.error(`Одно из обязательных полей не заполнено.`));
            }

            db.func('core', 'sf_create_user', session).Query({ params: [data.c_login, data.c_password, data.c_email, data.c_claims]}, function (data) {
                var res = result_layout.ok([]);
                res.result = data.result;
                callback(result_layout.ok([true]));
            });
        },

        /**
         * обновление пользователя
         * @param {any} data 
         * @param {function} callback  
         * @example
         * [{"action":"datalens","method":"update_user","data":[{ "id":1, "c_email": "test"}],"type":"rpc"}]
         */
        update_user: function (data, callback) {
            if(!session.user.isMaster) {
                return callback(result_layout.error(`Нет роли ${args.primary_role}`));
            }

            data = utils.normal_values(data);

            delete data.c_password;
            delete data.s_hash;
            delete data.c_login;
            delete data.b_oidc;
            delete data.c_claims;

            if(data.id == null || data.id == undefined || data.id == '') {
                Console.error(`Обновление информации другого аккаунта: идентификатор пользователя не найден`, 'USER', session.user.id, session.user.c_claims);
                callback(result_layout.error(new Error('Идентификатор пользователя не найден')));
            } else {
                db.table('core', 'pd_users', session).Update(data, function (result) {
                    if (result.meta.success == true) {
                        accessCacher.clearAccesses(data.id);

                        callback(result_layout.ok([result.result.records[0].rowCount == 1 ? true : 'Ошибка обновления']));
                    } else {
                        Console.error(`Обновление информации другого аккаунта ${data.id}: ${result.meta.msg}`, 'USER', session.user.id, session.user.c_claims);

                        callback(result_layout.error(new Error(result.meta.msg)));
                    }
                });
            }
        },

        /**
         * Сбросить пароль для пользователя
         * @param {*} data 
         * @param {*} callback 
         * 
         * @example
         * [{"action":"datalens","method":"password_reset","data":[{ "c_login": "user", "c_password": "******"}],"type":"rpc"}]
         * 
         * @todo Исключения;
         * user not child - пользователь не является дочерним;
         */
        password_reset: function(data, callback) {
            if(!session.user.isMaster) {
                return callback(result_layout.error(`Нет роли ${args.primary_role}`));
            }

            if(session.user.oidc) {
                return callback(result_layout.error(`Является внешним пользователем.`));
            }

            data = utils.normal_values(data);

            authorizeDb.passwordReset(data.c_login, data.c_password, function(email) {
                Console.debug(`Восстановление пароля ${data.c_login}`, 'USER', session.user.id, session.user.c_claims);
                callback(result_layout.ok(['Пароль изменён']));
            });
        },

        /**
         * обновление профиля у пользователя
         * @param {*} data 
         * @param {*} callback 
         * @example
         * [{"action":"datalens","method":"update_roles","data":[{ "id":1, "c_claims": 'inspector'}],"type":"rpc"}]
         */
         update_roles: function(data, callback) {
            if(!session.user.isMaster) {
                return callback(result_layout.error(`Нет роли ${args.primary_role}`));
            }

            data = utils.normal_values(data);

            var user_id = data.id;
            var roles = data.c_claims;

            if (user_id) {
                Console.debug(`Обновление профиля аккаунта ${user_id} на ${roles}`, 'USER', session.user.id, session.user.c_claims);

                db.func('core', 'pf_update_user_roles', session).Query({ params: [user_id, roles]}, function(result) {
                    if (result.meta.success) {
                        accessCacher.clearAccesses(user_id);
                        
                        callback(result_layout.ok(['Роли обновлены']));
                    } else {
                        Console.error(`Ошибка обновления роли у аккаунта ${user_id}: ${result.meta.msg}.`, 'USER', session.user.id, session.user.c_claims);

                        callback(result_layout.error(new Error(result.meta.msg)));
                    }
                });
            } else {
                Console.error(`Обновление роли у аккаунта ${user_id}`, 'USER', session.user.id, session.user.c_claims);
                callback(result_layout.error(new Error('Одно из обязательных полей равно null.')));
            }
        },

        users: function(data, callback) {
            if(!session.user.isMaster) {
                return callback(result_layout.error(`Нет роли ${args.primary_role}`));
            }

            if(session.user.isMaster) {
                db.func('core', 'of_users', session).Select({ params: [data]}, function (data) {
                    
                    var res = result_layout.ok([]);
                    res.result = data.result;
                    callback(res);
                });
            } else {
                callback(result_layout.ok([]));
            }
        },

        add_or_update_role: function(data, callback) {
            if(!session.user.isMaster) {
                return callback(result_layout.error(`Нет роли ${args.primary_role}`));
            }

            data = utils.normal_values(data);

            if(!data.id)
                delete data.id;

            if(data.c_name) {
                db.table('core', 'pd_roles', session).AddOrUpdate(data, function (result) {
                    if (result.meta.success == true) {
                        accessCacher.clearAccesses();

                        callback(result_layout.ok([result.result.records[0].rowCount == 1]));
                    } else {
                        Console.error(`Обновление информации по роли ${data.id}: ${result.meta.msg}`, 'USER', session.user.id, session.user.c_claims);

                        callback(result_layout.error(new Error(result.meta.msg)));
                    }
                });
            } else {
                Console.error(`Обновление информации по роли ${JSON.stringify(data)}: ${result.meta.msg}`, 'USER', session.user.id, session.user.c_claims);
                callback(result_layout.error(new Error('Одно из обязательных полей равно null.')));
            }
        },

        /**
         * Список проектов
         * @param {*} data 
         * @param {*} callback 
         * 
         * @example
         * [{ "action": "datalens", "method": "projects", "data": [{ }], "type": "rpc", "tid": 0 }]
         */
        projects: function(data, callback) {
            if(!session.user.isMaster) {
                data.isbase = true;
            }

            db.provider.db().query(`
            select  p.id AS project_id, 
                    p.c_name AS name, 
                    p.c_description AS description, 
                    p.b_base as isBase 
            from core.pd_projects AS p
            ${data.isbase ? "where p.b_base = true" : ""}
            ORDER BY p.c_name`, 
            null, function(err, rows) { 
                if(err) {
                    callback(result_layout.error(err)); 
                } else {
                    callback(result_layout.ok(rows.rows));
                }
            });
        },

        add_or_update_project: function(data, callback) {
            if(!session.user.isMaster) {
                return callback(result_layout.error(`Нет роли ${args.primary_role}`));
            }

            data = utils.normal_values(data);

            if(!data.id)
                delete data.id;

            if(data.c_name) {
                db.table('core', 'pd_projects', session).AddOrUpdate(data, function (result) {
                    if (result.meta.success == true) {
                        callback(result_layout.ok([result.result.records[0].rowCount == 1]));
                    } else {
                        Console.error(`Обновление информации по проекту ${data.id}: ${result.meta.msg}`, 'USER', session.user.id, session.user.c_claims);

                        callback(result_layout.error(new Error(result.meta.msg)));
                    }
                });
            } else {
                Console.error(`Обновление информации по проекту ${JSON.stringify(data)}: ${result.meta.msg}`, 'USER', session.user.id, session.user.c_claims);
                callback(result_layout.error(new Error('Одно из обязательных полей равно null.')));
            }
        }
    }
}