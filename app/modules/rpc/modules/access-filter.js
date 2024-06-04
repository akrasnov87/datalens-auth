/**
 * @file modules/rpc/modules/access-filter.js
 * @project skr-rpc-service
 * @author Александр
 * @todo фильтр RPC запроса
 */

 var cacher = require('./accesses-cacher');
 var logjs = require('../../log');
 
 /**
  * Проверка на возможность выполнения операции данным пользователем
  * @param {integer} userId идентификатор пользователя
  * @param {string} namespace пространство имен
  * @param {string} action сущность
  * @param {string} method метод
  * @param {()=>void} callback 
  * @returns {(boolean) => void} true - запрос разрешен
  */
 exports.permissions = function(user, action, callback) {
    cacher.getAccesses(user.id, function (convert) {

        var devices = user.devices ? user.devices.filter((i) => i.c_device_name_uf == 'Datalens Embed').length : 0;

        if(devices > 0) {
            // значит это preview и Datalens
            return callback({
                listAccessBindings: false,
                updateAccessBindings: false,
                createCollection: false,
                createWorkbook: false,
                limitedView: false,
                view: false,
                update: false,
                copy: false,
                move: false,
                delete: false,
                hidden: true,
                createCollection: false,
                createCollectionInRoot: false,
                createWorkbook: false,
                createWorkbookInRoot: false
            });
        }

        if (validAction('DL', action, 'Select', convert)) {
            callback({
                listAccessBindings: true,
                updateAccessBindings: true,
                limitedView: true,
                view: true,
                update: true,
                copy: true,
                move: true,
                delete: true,
                hidden: false,
                createCollection: convert.method.Add['collection'] == undefined ? false : convert.method.Add['collection'],
                createWorkbook: convert.method.Add['workbook'] == undefined ? false : convert.method.Add['workbook'],
                createCollectionInRoot: convert.method.Add['collectionInRoot'] == undefined ? false : convert.method.Add['collectionInRoot'],
                createWorkbookInRoot: convert.method.Add['workbookInRoot'] == undefined ? false : convert.method.Add['workbookInRoot'],
            });
        } else {
            callback({
                listAccessBindings: true,
                updateAccessBindings: true,
                createCollection: convert.method.Add['collection'] == undefined ? false : convert.method.Add['collection'],
                createWorkbook: convert.method.Add['workbook'] == undefined ? false : convert.method.Add['workbook'],
                createCollectionInRoot: convert.method.Add['collectionInRoot'] == undefined ? false : convert.method.Add['collectionInRoot'],
                createWorkbookInRoot: convert.method.Add['workbookInRoot'] == undefined ? false : convert.method.Add['workbookInRoot'],
                limitedView: true,
                view: convert.method.Select[action] == undefined ? false : convert.method.Select[action],
                hidden: convert.method.Select[action] == undefined ? true : !convert.method.Select[action],
                update: convert.method.Update[action] == undefined ? false : convert.method.Update[action],
                copy: convert.method.Add[action] == undefined ? false : convert.method.Add[action],
                move: convert.method.AddOrUpdate[action] == undefined ? false : convert.method.AddOrUpdate[action],
                delete: convert.method.Delete[action] == undefined ? false : convert.method.Delete[action]
            });
        }
    });
}

 /**
  * Проверка на возможность выполнения операции данным пользователем
  * @param {integer} userId идентификатор пользователя
  * @param {string} namespace пространство имен
  * @param {string} action сущность
  * @param {string} method метод
  * @param {()=>void)} callback 
  * @returns {(boolean) => void} true - запрос разрешен
  */
 exports.verify = function(userId, namespace, action, method, callback) {
     cacher.getAccesses(userId, function (convert) {
         try {
             // проверка можно ли делать запрос
             if (validAction(namespace, action, method, convert)) {
                 callback(true);
             } else {
                 callback(false);
             }
         } catch (e) {
             logjs.error(e.toString());
 
             callback(false);
         }
     });
 }
 
 /**
  * фильтр для получения доступа к данным
  * @param {any} item запрос RPC
  * @param {user_id} идентификатор пользователя
  * @param {any} schema схема БД
  * @param {function} callback 
  * @example
  * filter(itemRPC, res.user.id, schema, function (err, rows) {
  *      if(rows) {
  *          // фильтр пройден
  *      } else {
  *          console.log(err);
  *      }
  * })
  */
 exports.filter = function (namespace, item, user_id, schema, callback) {
     cacher.getAccesses(user_id, function (convert) {
         try {
             // проверка на возможность удаления записи
             if (item.method == 'Delete') {
                 // если запрещено, то обновление
                 if (accessDelete(item.action, convert, schema)) {
                     item.method = 'Update';
                     item.data[0].sn_delete = true;
                 }
             }
 
             // проверка можно ли делать запрос
             if (validAction(namespace, item.action, item.method, convert)) {
                 var filter_delete_items = filterDeleteItems(item.action, item.method, convert, schema);
 
                 // дополнительное условие для просмотра удаленных данных
                 if (filter_delete_items == true) {
                     var data = item.data[0];
                     data.filter = data.filter || [];
                     data.filter.push({
                         property: 'sn_delete',
                         value: false
                     });
                 }
                 var system_records = convert.criteria[item.action];
                 var table = convert.getTable(schema, item.action);
 
                 if (system_records && ((table.PRIMARY_KEY && (item.method == 'Query' || item.method == 'Select')) || item.method == 'Query' || item.method == 'Select')) {
                     var data = item.data[0];
                     if (!data) {
                         item.data = [{}];
                         data = item.data[0];
                     }
                     data.filter = data.filter || [];
 
                     if (data.filter.length > 0) {
                         var isLogicOperator = false;
                         while (!isLogicOperator) {
                             var lastFilter = data.filter[data.filter.length - 1];
                             if (typeof lastFilter == 'string') {
                                 data.filter.pop();
                             } else {
                                 isLogicOperator = true;
                             }
                         }
                     }
 
                     for (var i in system_records) {
                         var array = JSON.parse(system_records[i].record_criteria.replace(/\$f_user/g, user_id));
                         var inner_criteria = [];
                         for (var j in array) {
                             var criteria = array[j];
                             inner_criteria.push(criteria);
                         }
                         if (data.filter.length > 0) {
                             data.filter = [data.filter];
                         }
                         data.filter.push(inner_criteria);
                     }
                 }
                 callback(null, item);
             } else {
                 callback(null, null);
             }
         } catch (e) {
             callback(e, null);
         }
     });
 }
 
 /**
  * функция фильтрации безопасности. Например фильтрация колонок
  * @param {any} session состояние сессии
  * @returns {boolean}
  * @example
  * // фильтр колонок
  * security(session)('select_column', tableName, column)
  */
 exports.security = function (session) {
     // нужно вернуть функцию т.к. надо прокинуть сессию
     return function (type, tableName, columnName) {
         if (session) {
             var result = null;
             // получаем безопасность
             cacher.getAccesses(session.user.id, function (convert) {
                 result = convert;
             });
 
             // фильтрация колонок
             var accesses = result.columns[tableName];
 
             if (accesses) {
                 switch (type) {
                     // безопасность на выборку колонок
                     case 'select_column':
                         for (var i = 0; i < accesses.length; i++) {
                             var item = accesses[i];
 
                             var columns = ',' + item.column_name + ',';
                             if (columns.indexOf(',' + columnName + ',') >= 0) {
                                 return false;
                             }
                         }
                         break;
 
                     default:
                         return true;
                 }
             } else {
                 return true;
             }
         }
         return true;
     };
 }
 
 /**
  * проверка действий
  * @param {string} namespace пространство имен
  * @param {string} action действие
  * @param {string} method метод
  * @param {any} records результат запроса
  * @returns {boolean}
  */
 function validAction(namespace, action, method, convert) {
    var access_rpc_function = convert.rpc_function.filter(function (i) {
        if ((i.rpc_function.indexOf('.' + action + '.' + method) > 0) ||
            (i.rpc_function.indexOf('.' + action + '.*') > 0) ||
            (i.rpc_function.indexOf(namespace + '.*') == 0) ||
            ((namespace + '.' + action).indexOf(i.rpc_function.replace('*', '')) == 0)) {
            return true;
        }
    });
     var is_access_rpc_function = access_rpc_function.length > 0;
 
     var is_accesse_method = false;
 
     if (convert.method[method] == undefined)
         is_accesse_method = false;
     else
         is_accesse_method = convert.method[method][action] != undefined;
 
     return is_access_rpc_function || is_accesse_method;
 }
 
 /**
  * проверка на возможность удаления
  * @param {string} action действие
  * @param {string} method метод
  * @param {any} records результат запроса
  * @param {any} schema схемы
  * @returns {boolean}
  */
 function accessDelete(action, convert, schema) {
     return convert.getIsDeletable(action, schema) && (convert.delete[action] == false || convert.delete[null] == false);
 }
 
 /**
  * проверка на просмотр удаленных записей
  * @param {string} action действие
  * @param {string} method метод
  * @param {any} records результат запроса
  * @param {any} schema схемы
  * @returns {boolean}
  */
 function filterDeleteItems(action, method, convert, schema) {
     return method == 'Query' && convert.getIsDeletable(action, schema) && (convert.delete[action] == false || convert.delete[null] == false);
 }