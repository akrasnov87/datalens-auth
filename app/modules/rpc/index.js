/**
 * @file modules/rpc/index.js
 * @project skr-rpc-service
 * @author Александр
 */

var express = require('express');
var router = express.Router();

var authUtil = require('../authorize/util');
var shellContext = require('../custom-context/shell');
var datalensContext = require('../custom-context/datalens');
var rpcRouter = require('./router/rpc');
var rpcQuery = require('./modules/rpc-query');

/**
 * инициализация модуля для работы с RPC
 * @param {string} auth_type тип авторизации. По умолчанию basic
 */
module.exports = function (auth_type) {
    var contexts = [];

    contexts.push(datalensContext);
    contexts.push(shellContext);

    rpcQuery.registryContext(contexts);

    router.use(rpcRouter(auth_type));

    var authType = authUtil.getAuthModule(auth_type);
    router.post('/auth', authType.authorize);

    return router;
}