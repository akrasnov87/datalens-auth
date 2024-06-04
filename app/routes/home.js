/**
 * @file routes/home.js
 * @project skr-rpc-service
 * @author Александр
 * @todo Домашняя страница
 */

var express = require("express");
var router = express.Router();
var pkg = require('../package.json');
var moment = require('moment');
const args = require('../modules/conf')();
 
module.exports = function () {
    router.get("/", home);

    return router;
}
 
/**
 * Домашняя страница
 * 
 * @example
 * GET ~/
 */
function home(req, res) {
   res.render('index', {
       version: pkg.version,
       date: moment(new Date()).format('DD.MM.YYYY HH:mm:ss'),
       title: args.name
   });
}
