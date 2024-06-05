/**
 * @file modules/dbcontext.js
 * @project skr-rpc-service
 * @author Александр Краснов
 */

var provider = require('mobnius-pg-dbcontext/index.v3');
var filter = require('./rpc/modules/access-filter');
var args = require('./conf')();
var util = require('./rpc/util');
var utils = require('./utils');
provider.initPool(utils.normal_conn_str(args.connection_string), global.schemas, args.query_limit, args.application_name);

/**
 * Специальный компонент для создания ручных запросов
 * @example
 * // https://node-postgres.com/
 * db.provider.db().query(queryText:string, params:any[], function(err, rows, time, options) {
 *      // , где queryText - строка запроса, params - параметры
 *      if(!err) {
 *          // rows - результат выполнения, time - время запроса в милисекундах, options - дополнительные данные
 *      } else {
 *          console.log(err);
 *      }
 * }); 
 */
 exports.provider = provider;

 exports.table = function(schema, name, session) {
    session = session || {};
    return {
        Query: function (query_param, callback) {
            provider.select(schema, name, query_param, filter.security(session), filterOrg(schema, name, session.user), callback);
        },
        Select: function (query_param, callback) {
            if(Array.isArray(query_param.params)) {
                query_param.params.unshift(session.user);
            }
            provider.select(schema, 'of_mui_' + name + "()", query_param, filter.security(session), null, callback);
        },
        Add: function (data, callback) {
            if(util.isJournal(schema, name)) {
                setJournal(data, session.user.c_login, true);
            }

            provider.insert(schema, name, data, function() {
                callback(arguments[0]);
            });
        },
        AddOrUpdate: function (data, callback) {
            provider.insertOrUpdate(schema, name, getIdName(schema, name), (createMode) => { 
                if(util.isJournal(schema, name)) {
                    setJournal(data, session.user.c_login, createMode);
                }
    
                return data;
            }, filterOrg(schema, name, session.user), function() {
                callback(arguments[0]);
            });
        },
        Update: function (data, callback) {
            if(util.isJournal(schema, name)) {
                setJournal(data, session.user.c_login, false);
            }

            provider.update(schema, name, getIdName(schema, name), data, filterOrg(schema, name, session.user), function() {
                callback(arguments[0]);
            });
        },
        Delete: function (data, callback) {
            provider.delete(schema, name, getIdName(schema, name), data, filterOrg(schema, name, session.user), function() {
                callback(arguments[0]);
            });
        },
        Count: function (query_param, callback) {
            provider.count(schema, name, query_param, filterOrg(schema, name, session.user), callback);
        }
    }
}

exports.view = function (schema, name, session) {
    session = session || {};
    return {
        Query: function (query_param, callback) {
            provider.select(schema, name, query_param, filter.security(session), null, callback);
        },
        Count: function (query_param, callback) {
            provider.count(schema, name, query_param, null, callback);
        }
    }
}

exports.func = function (schema, name, session) {
    session = session || {};
    return {
        Query: function (query_param, callback) {
            if(name.indexOf('of_') == 0) { // специальный дополнительный параметр для проброса безопасности
                if(Array.isArray(query_param.params)) {
                    query_param.params.unshift(session.user);
                }
            }
            provider.call(schema, name, query_param.params, function() {
                callback(arguments[0]);
            });
        },
        Select: function (query_param, callback) {
            if(name.indexOf('of_') == 0) { // специальный дополнительный параметр для проброса безопасности
                if(Array.isArray(query_param.params)) {
                    query_param.params.unshift(session.user);
                }
            }
            provider.select(schema, name + '()', query_param, filter.security(session), null, function() {
                callback(arguments[0]);
            });
        }
    }
}

function getIdName(schema, tableName) {
    var table = global.schemas.map[schema][tableName];
    if (table.TABLE_TYPE == "BASE TABLE") {
        return table.PRIMARY_KEY;
    }
    return null;
}

/**
 * Устанавливаем поля для журнала изменения
 * @param {any|any[]} data данные для обработки
 * @param {integer} userId иден. пользователя
 * @param {boolean} createMode true - создание записи 
 */
function setJournal(data, userId, createMode) {
    if (Array.isArray(data) == true) {
        for (var i in data) {
            if (createMode) {
                data[i].c_created_user = userId;
                data[i].d_created_date = new Date()
            } else {
                data[i].c_change_user = userId;
                data[i].d_change_date = new Date();
            }
        }
    } else {
        if (createMode) {
            data.c_created_user = userId;
            data.d_created_date = new Date()
        } else {
            data.c_change_user = userId;
            data.d_change_date = new Date();
        }
    }
}

function filterOrg(schema, tableName, user) {
    if(user && util.isOrgFilter(schema, tableName)) {
        if(user.c_claims.indexOf(args.primary_role) >= 0 
            || user.c_claims.indexOf(args.secodary_role) >= 0) {
            return null;
        } else {
            return util.getOrgId(user);
        }
    }

    return null;
}