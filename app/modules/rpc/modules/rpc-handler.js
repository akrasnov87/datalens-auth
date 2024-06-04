/**
 * @file modules/rpc/modules/rpc-handler.js
 * @project skr-rpc-service
 * @author Aleksandr Krasnov
 */

 var rpcQuery = require('../modules/rpc-query');
 var accessFilter = require('../modules/access-filter');
 var Console = require('../../log');
 var utils = require('../../utils');
 var util  = require('../util');
 var args = require('../../conf')();
 var pkg = require('../../../package.json');
 var accessesCacher = require('./accesses-cacher');
 
 module.exports = function (req, res, finish) {
     var body = req.body;
     var results = [];
     let namespace = (req.params ? req.params.name : null) || 'PN';
     var schemas = global.schemas;
 
     var sessionState = {
         user: res.user,
         isAuthorize: res.isAuthorize,
         response: res,
         request: req
     };
 
     function next(tableChange, callback) {
        var dt = new Date();
         var item = body[0];
         if (item) {
            //Console.debug(`RPC запрос пользователя ${res.user.c_login}: ` + JSON.stringify(item), 'RPC', res.user.id, res.user.c_claims);
 
             body.shift();
             if (!item.data || (item.data && !Array.isArray(item.data))) {
                 results.push(createBadRequest(req, res, item, new Error('Требуется указать свойство data: [{}]')));
                 return next(tableChange, callback);
             }
             namespace = item.schema || namespace;
             if(!req.params) {
                req.params = {};
             }
             req.params.name = namespace;
             item = securityData(sessionState.user, item, item.schema || namespace, item.action, item.method);
 
             var alias = item.data[0].alias;
             if (alias) {
                 /**
                  * псевдоним результата запроса
                  */
                 item.alias = alias;
             }
 
             accessFilter.filter(namespace, item, res.user.id, schemas, function (err, rows) {
                 if (rows && item.data && item.data.length > 0) {
                     var _items = item.data.length > 1 ? item.data : item.data[0];
                     rpcQuery.query(sessionState, item.action, item.method, item.tid, item.change, tableChange, _items, function (result) {
                         if (item.method != 'Query' && item.method != 'Exists' && item.method != 'Select') { // тут добавлен аудит для записей
                            var table = schemas.map[namespace] ? schemas.map[namespace][item.action] : undefined;
 
                             if (table) {
                                 result.result.records = Array.isArray(_items) ? _items : [_items];
                                 result.result.total = result.result.records.length;
                             }
                         }
 
                         result.authorizeTime = res.authorizeTime;
                         result.totalTime = new Date() - dt;
                         result.host = utils.getCurrentHost();
                         result.version = pkg.version;
                         result['arm_version'] = global.settings['arm_version'];
                         if (alias) {
                             result.action = alias;
                         }
 
                         if(!args.debug) {
                             delete result.sql;
                             delete result.time;
                             delete result.host;
                             delete result.totalTime;
                             delete result.authorizeTime;
                         }

                         var answer = JSON.parse(JSON.stringify(result));
                         answer.result.records = [];
                         Console.debug(`RPC ответ: ` + JSON.stringify(answer), 'RPC_RESPONSE', res.user.id, res.user.c_claims, new Date() - dt, null, `${result.action}.${result.method}`);

                         results.push(result);
                         next(tableChange, callback);
                     });
                 } else {
                     if (rows == null && res.user.id == -1) { // значит не авторизовался
                         return res.json([{
                             meta: {
                                 success: false,
                                 msg: 'No authorize'
                             },
                             code: 401,
                             tid: item.tid,
                             type: "rpc",
                             method: item.method,
                             action: item.action,
                             host: utils.getCurrentHost()
                         }]);
                     }
                     if (err == null && rows == null) {
                         err = new Error('Пользователь не имеет прав на выполнение операции.');
                     }
                     if (!item.data || item.data.length == 0) {
                         err = new Error('Условия запроса не указаны.');
                     }
                     var response = createBadRequest(req, res, item, err);
                     results.push(response);
 
                     next(tableChange, callback);
                 }
             });
         } else {
             callback();
         }
     }
 
     var dta = Date.now();
     getTableState(req.isFrom, res.user, function (tableChange) {
        if (Array.isArray(body) == true) {
            next(tableChange, function () {
                Console.debug(null, 'RPC_PACKAGE', res.user.id, res.user.c_claims, Date.now() - dta, body.length);

                finish(results);
            });
        } else {
            body = [body];
            next(tableChange, function () {
                Console.debug(null, 'RPC_PACKAGE', res.user.id, res.user.c_claims, Date.now() - dta, 1);

                finish(results);
            });
        }
     });
 }

 function getTableState(isFrom, user, callback) {
    accessesCacher.getTableState(isFrom, user, callback);
}
 
 
 /**
  * создание ответа на запроса
  * @param {*} req 
  * @param {*} res 
  * @param {*} itemRPC запрос RPC
  * @param {*} err ошибка
  * @returns {any}
  */
 function createBadRequest(req, res, itemRPC, err) {
     var response = {
         code: 400,
         action: itemRPC.action,
         method: itemRPC.method,
         meta: {
             success: false,
             msg: 'Bad request ' + (err ? err.toString() : '') + '. Body: ' + JSON.stringify(itemRPC)
         },
         result: {
             records: [],
             total: 0
         },
         tid: itemRPC.tid,
         type: 'rpc',
         host: utils.getCurrentHost()
     };
     
     Console.error(`Ошибка RPC: ${response.meta.msg}`, 'RPC', res.user.id, res.user.c_claims);

     return response;
 }
 
 function securityData(user, item, schema, tableName, method) {
     if(method == 'Add' || method == 'Update' || method == 'AddOrUpdate') { 
         var filter = util.isOrgFilter(schema, tableName);
         if(filter) {
             if(user.c_claims.indexOf('.master.') >= 0) {
                 return item;
             }
 
             var data = item.data[0];
             if(Array.isArray(data)) {
                 for(var i in data) {
                     data[i].f_org = util.getOrgId(user);
                 }
             } else {
                 data.f_org = util.getOrgId(user);
             }
 
             return item;
         }
     }
 
     return item;
 }