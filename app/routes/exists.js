/**
 * @file routes/exists.js
 * @project skr-rpc-service
 * @author Александр
 * @todo проверка доступности сервера
 */

 var express = require("express");
 var router = express.Router();
 var pkg = require('../package.json');
 var result_layout = require('mobnius-pg-dbcontext/modules/result-layout');
 const args = require('../modules/conf')();
 const process = require('process');
 var pkg = require('../package.json');
 
 module.exports = function (auth_type) {
    
    /**
     * Проверка доступности сервиса
     * 
     * @example
     * 
     * GET ~/exists
     * 
     * Headers
     * Content-Type: application/json
     */
    router.get("/", function(req, res) {
        res.json(result_layout.ok([{
            version: pkg.version,
            ip: req.ip,
            now: new Date(),
            host: process.uid,
            conf: args.conf,
            version_container: args.version_container,
            version: pkg.version
        }]));
    });

    return router;
 }