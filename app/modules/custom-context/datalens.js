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

/**
 * Объект с набором RPC функций
 */
exports.datalens = function (session) {

    return {

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

            var devices = session.user.devices ? session.user.devices.filter((i) => i.c_device_name_uf == 'Datalens Embed').length : 0;

            accessFilter.filter(devices > 0 ? 'DL.PREVIEW' : 'DL', data, session.user.id, schemas, function (err, rows) {
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
         * Проверка доступа к таблицам
         * 
         * @example
         * [{ action: "datalens", method: "tables", data: [{ }], type: "rpc", tid: 0 }]
         */
        tables: function(data, callback) {
            var results = [];
            function next(callback) {
                var item = data[0];
                if(item != null) {
                    data.shift();
                    accessFilter.verify(session.user.id, item.parameters.schema_name, item.parameters.table_name, 'Select', (ver) => {
                        if(ver == true) {
                            results.push(item);
                        }

                        next(callback);
                    })
                } else {
                    callback();
                }
            }
            next(() => {
                callback(result_layout.ok(results));
            })
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
            accessFilter.permissions(session.user, data.id || data.title, function (permissions) {
                if (permissions) {
                    callback(result_layout.ok([permissions]));
                } else {
                    Console.error(`Пользователь не имеет прав на выполнение операции: ${JSON.stringify(data)}`, 'DATALENS_PERMISSIONS', session.user.id, session.user.c_claims);
                    
                    callback(result_layout.ok([{ hidden: true }]));
                }
            });
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
            if(args.auth_key_mode) {
                var ip = session.request.headers['x-forwarded-for'] || session.request.ip || session.request.socket.remoteAddress;
                // создаётся специально подключение с другого устройства
                db.provider.db().query('select * from core.sf_update_auth($1, $2, $3, $4, $5, $6)', ['Datalens Embed', session.user.id, null, ip, data.entryId, args.auth_key_mode], function(err, rows) { 
                    if(err) {
                        callback(result_layout.ok([{ 'statusCode': 500, 'message': err.toString() }])); 
                    } else {
                        var key = rows.rows[0].sf_update_auth;
                        if(key != null) {
                            callback(result_layout.ok([{ 'statusCode': 200, 'embed': Buffer.from(UserName + ':' + key).toString('base64') }]));
                        } else {
                            callback(result_layout.ok([{ 'statusCode': 200, 'embed': session.request.headers['rpc-authorization'] }]));
                        }
                    }
                });
            } else {
                callback(result_layout.ok([{ 'statusCode': 200, 'embed': session.request.headers['rpc-authorization'] }]));
            }
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
                    r.n_weight AS weight 
            from core.pd_roles AS r`, 
            null, function(err, rows) { 
                if(err) {
                    callback(result_layout.error(err)); 
                } else {
                    callback(result_layout.ok(rows.rows));
                }
            });
        },

        /**
         * Список разрешений
         * @param {*} data 
         * @param {*} callback 
         * 
         * @example
         * [{ "action": "datalens", "method": "accesses", "data": [{ "dl": "w203ynnjgfkck" }], "type": "rpc", "tid": 0 }]
         */
        accesses: function(data, callback) {
            db.provider.db().query(`
            SELECT 	pa.f_role AS role_id,
                    CASE WHEN pa.c_function ILIKE '%.Select' THEN true ELSE false END AS "select",
                    CASE WHEN pa.c_function ILIKE '%.Add' THEN true ELSE false END AS "add",
                    CASE WHEN pa.c_function ILIKE '%.Update' THEN true ELSE false END AS "update",
                    CASE WHEN pa.c_function ILIKE '%.Delete' THEN true ELSE false END AS "delete"
            FROM core.pd_accesses as pa
            WHERE pa.c_function ILIKE ('DL.' || $1 || '.%');`, 
            [data.dl], function(err, rows) { 
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
         * [{ "action": "datalens", "method": "updateAccesses", "data": [{ "dl": "w203ynnjgfkck", "role_id": -1, "select": true, "add": true, "update": true, "delete": true, "destroy": true }], "type": "rpc", "tid": 0 }]
         */
        updateAccesses: function(data, callback) {
            var errors = [];

            function nextDestroy(item, _callback) {
                // удаление записи
                if(item.method) {
                    db.provider.db().query(`
                    DELETE FROM core.pd_accesses as pa
                    WHERE pa.c_function ILIKE ('DL.' || $1 || '.' || $2) AND ${item.role_id == undefined ? "pa.f_user" : "pa.f_role"} = $3;`, 
                    [item.dl, item.method, item.role_id == undefined ? session.user.id : item.role_id], function(err, rows) { 
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
                    INSERT INTO core.pd_accesses(${item.role_id == undefined ? "f_user" : "f_role"}, c_function)
                    VALUES($3, 'DL.' || $1 || '.' || $2);`, 
                    [item.dl, item.method, item.role_id == undefined ? session.user.id : item.role_id], function(err, rows) { 
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
            next({dl: data.dl, method: (data['*'] ? (data.destroy ? "%" : '*') : (data.destroy ? "%" : null)), role_id: data.role_id }, (err, rows) => {
                nextInsert({dl: data.dl, method: data.select ? "Select" : null, role_id: data.role_id }, (err, rows) => {
                    nextInsert({dl: data.dl, method: data.add ? "Add" : null, role_id: data.role_id }, (err, rows) => {
                        nextInsert({dl: data.dl, method: data.update ? "Update" : null, role_id: data.role_id }, (err, rows) => {
                            nextInsert({dl: data.dl, method: data.delete ? "Delete" : null, role_id: data.role_id }, (err, rows) => {
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
        }
    }
}