/**
 * @file modules/rpc/modules/rpc-query.js
 * @project skr-rpc-service
 * @author Александр
 * @todo обработчик запросов ~/rpc
 */

 var pkg = require('../../../package.json');
 var utils = require('../../utils');
 var db = require('../../dbcontext');
 var accessFilter = require('./access-filter');
 var args = require('../../conf')();
 
 /**
  * массив контекстов
  * @type {any}
  */
 var contexts = [];
 
 /**
  * возвращается объект для получения мета информации
  * @example
  * GET ~/rpc/meta
  * @return {JSON}
  */
 exports.meta = function (options, session, callback) {
     var result = {
         enableBuffer: false,
         maxRetries: 1,
         url: "/rpc/" + options.namespace,
         type: "remoting",
         id: options.namespace == 'PN' ? 'default' : options.namespace,
         version: pkg.version,
         actions: {
 
         }
     };
 
     Object.assign(result, options);
     var rpc = [];
 
     function next(iter) {
         var item = rpc[0];
         if (item) {
             rpc.shift();
             accessFilter.verify(session.user.id, options.namespace, item.action, item.method, (verify) => {
                 if(verify == true) {
                     if (!result.actions[item.action]) {
                         result.actions[item.action] = []
                     }
                     result.actions[item.action].push({ name: item.method, len: 1 }); 
                 }
                 next(iter);
             });
             
         } else {
             iter(result);
         }
     }
 
     if(result.namespace == 'PN') {
         // просматриваем локальные функции
         contexts.forEach(function (context) {
             for (var i in context) {
                 if (context[i].length == 0 || context[i].length == 1) {
                     var item = context[i](session);
                     for (var j in item) {
                         if (typeof item[j] == 'function') {
                             rpc.push({action: i, method: j});
                         }
                     }
                 }
             }
         });
     } else {
         // информацию брать из БД
         var tables = global.schemas.tables;
         for(var t in tables) {
             var table = tables[t];
 
             if (table.TABLE_SCHEMA == result.namespace) {
                 if (table.TABLE_TYPE == "BASE TABLE") {
                     rpc.push({action: table.TABLE_NAME, method: "Query"});
                     rpc.push({action: table.TABLE_NAME, method: "Select"});
                     rpc.push({action: table.TABLE_NAME, method: "Add"});
                     rpc.push({action: table.TABLE_NAME, method: "AddOrUpdate"});
                     rpc.push({action: table.TABLE_NAME, method: "Update"});
                     rpc.push({action: table.TABLE_NAME, method: "Delete"});
                     rpc.push({action: table.TABLE_NAME, method: "Count"});
                 } else if(table.TABLE_TYPE == "VIEW") {
                     rpc.push({action: table.TABLE_NAME, method: "Query"});
                     rpc.push({action: table.TABLE_NAME, method: "Count"});
                 } else if(table.TABLE_TYPE == "FUNCTION") {
                     rpc.push({action: table.TABLE_NAME, method: "Query"});
                     rpc.push({action: table.TABLE_NAME, method: "Select"});
                 }
             }
         } 
     }
 
     return next(callback);
 }
 
 /**
  * Получение информации о таблице. 
  * Доступно только авторизованному пользователю, у которого есть доступ для чтения информации по этой таблице (Query)
  * @example
  * GET ~/rpc/meta/[схема]/[таблица]
  * @returns {JSON}
  */
 exports.mateTable = function (options, session, callback) {
     var result = {
         url: "/rpc/" + options.namespace + "/" + options.table,
         type: "remoting",
         id: options.namespace + '.' + options.table,
         version: pkg.version,
         info: {
 
         }
     };
 
     Object.assign(result, options);
     var table = global.schemas.map[result.namespace][options.table];
 
     accessFilter.verify(session.user.id, options.namespace, options.table, "Query", (verify) => {
         if(verify == true) {
             result.info = table; 
         }
         callback(result);
     });
 }
 
 /**
  * выполнение запроса
  * @param {any} session что-то вроде сессии, для дополнительной обработки
  * @param {string} action наименование сущности
  * @param {string} method метод
  * @param {number} tid идентификатор транзакции
  * @param {any} data данные для обработки
  * @param {function} callback функция обратного вызова
  * 
  * @example
  * POST ~/rpc
  * 
  * @returns {JSON}
  */
 exports.query = function (session, action, method, tid, change, tableChange, data, callback) {
     function contextCallback(result) {
         result.tid = tid;
         result.type = 'rpc';
         result.method = method;
         result.action = action;

         if(!args.debug) {
            delete result.sql;
            delete result.time;
            delete result.host;
            delete result.totalTime;
            delete result.authorizeTime;
        }
 
         callback(result);
     }
 
     try {

        if(change && tableChange && change != 0 && change >= tableChange[action]) {
            // значит не нужно обращаться в БД
            return callback({
                tid: tid,
                type: 'rpc',
                method: method,
                action: action,
                result: {
                    records: [],
                    total: 0
                },
                meta: {
                    success: true
                },
                change: tableChange[action],
                code: 301,
                host: utils.getCurrentHost()
            });
        }

         var context = null;
         for (var i in contexts) {
             context = contexts[i];
 
             var actionFunction = context[action];
             if (actionFunction && typeof actionFunction == 'function') {
                 var actionResult = actionFunction(session);
                 if (actionResult && actionResult[method]) {
 
                     return context[action](session)[method](data, contextCallback);
                 }
             }
         }
         var namespace = session.request.params.name;
         var table = global.schemas.map[namespace][action];
         
         switch(table.TABLE_TYPE) {
             case 'BASE TABLE':
                 db.table(namespace, action, session)[method](data, contextCallback);
                 break;
 
             case 'VIEW':
                 db.view(namespace, action, session)[method](data, contextCallback);
                 break;
 
             case 'FUNCTION':
                 db.func(namespace, action, session)[method](data, contextCallback);
                 break;
         }
     } catch (exc) {
         callback({
             tid: tid,
             type: 'rpc',
             method: method,
             action: action,
             result: {
                 records: [],
                 total: 0
             },
             meta: {
                 success: false,
                 msg: exc.toString()
             },
             code: 400,
             host: utils.getCurrentHost()
         });
     }
 }
 
 /**
  * Регистрация пользовательских контекстов созданных в nodeJS.
  * Информация по ним храниться в папке custom-context
  * @param {any} context контекст 
  */
 exports.registryContext = function (context) {
     if (!Array.isArray(context))
         contexts.push(context);
     else {
         for (var i in context)
             contexts.push(context[i]);
     }
 }