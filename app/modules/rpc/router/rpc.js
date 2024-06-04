/**
 * @file modules/rpc/router/rpc.js
 * @project skr-rpc-service
 * @author Александр
 * @todo Выполнение RPC запросов
 */

var express = require('express');
var router = express.Router();
//var join = require('path').join;

var rpcQuery = require('../modules/rpc-query');
var authUtil = require('../../authorize/util');
var cacher = require('../modules/accesses-cacher');
var handler = require('../modules/rpc-handler');
var db = require('../../dbcontext');
var converter = require('json-2-csv');
var accessFilter = require('../modules/access-filter');
var utils = require('../../utils');

module.exports = function (auth_type) {
    var authType = authUtil.getAuthModule(auth_type);
    router.use('/rpc', authType.user(false));

    router.post('/rpc', getData);
    router.post('/rpc/:name', getData);

    router.use('/rpc/:name/:format', authType.user(false));
    router.use('/rpc/:name/:format/:table', authType.user(false));

    router.post('/rpc/:name/:format', getData);
    router.post('/rpc/:name/:format/:table', getData);

    router.get('/rpc/meta', getMeta);
    router.get('/rpc/meta/:name', getMeta);
    router.get('/rpc/meta/:name/:table', getMeta);

    return router;
}

/**
 * POST запрос для обработки RPC. Доступен по авторизации
 * @param {*} req 
 * @param {*} res 
 * @example
 * POST ~/rpc 
 * // подробнее тут https://www.appcode.pw/?page_id=412
 */
function getData(req, res) {
    req.isFrom = true;

    let namespace = req.params.name;
    let isCsv = req.params.format == 'csv';
    let table = req.params.table;

    if(req.headers['content-type'].indexOf('text/csv') >= 0) {
        // значит тип импорт данных
        var csv = '';
        req.on('data', chunk => { csv += chunk.toString() });

        req.on('end', () => {
            accessFilter.verify(res.user.id, namespace, table, 'Add', function (verify) {
                if (verify == true) {
                    converter.csv2json(csv.replace(/,\r/g, ',null').replace(/\r/g, ''), (err, array) => {
                        if(err) {
                            res.send(err);
                        } else {
                            var sessionState = {
                                user: res.user,
                                isAuthorize: res.isAuthorize,
                                response: res,
                                request: req
                            };

                            db.table(namespace, table, sessionState).Add(array, (meta) => {
                                res.json([{
                                    meta: meta.meta,
                                    code: meta.code,
                                    tid: 0,
                                    type: "rpc",
                                    method: 'Add',
                                    action: table,
                                    host: utils.getCurrentHost(),
                                    totalTime: meta.totalTime,
                                    time: meta.time
                                }]);
                            });
                        }
                    });
                } else {
                    res.json([{
                        meta: {
                            success: false,
                            msg: 'Пользователь не имеет прав на выполнение операции.'
                        },
                        code: 401,
                        tid: 0,
                        type: "rpc",
                        method: 'AddOrUpdate',
                        action: table,
                        host: utils.getCurrentHost()
                    }]);
                }
            });
        });
    } else {
        handler(req, res, function (results) {
            if(isCsv) {
                // https://github.com/mrodrig/json-2-csv/blob/stable/README.md
                //git+https://github.com/akrasnov87/json-2-csv.git
                converter.json2csv(results[0].result.records, (err, csv) => {
                    res.send(err||csv);
                }, {
                    prependHeader: true,
                    unwindArrays: true,
                    emptyFieldValue: null
                });
            } else {
                res.json(results);
            }
        });
    }
}

/**
 * GET-запрос для получение мета-информации для RPC
 * @param {*} req 
 * @param {*} res 
 * @example
 * GET ~/rpc/meta/:name/:table - где name имя пространства имен для анализа
 */
function getMeta(req, res) {
    // тут специально прогреваем кеш-безопасности
    cacher.getAccesses(res.user.id, () => {
        var sessionState = {
            user: res.user,
            isAuthorize: res.isAuthorize,
            response: res,
            request: req
        };

        if (req.params.table && req.params.name) {
            rpcQuery.mateTable({
                namespace: req.params.name,
                table: req.params.table
            }, sessionState, (data) => {
                res.json(data);
            });
        } else {
            rpcQuery.meta({
                namespace: req.params.name || 'PN'
            }, sessionState, (data) => {
                res.json(data);
            });
        }
    });
}