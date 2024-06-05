/**
 * @file modules/utils.js
 * @project skr-rpc-service
 * @author Александр Краснов
 */

var args = require('./conf')();
const process = require('process');
var parse = require('pg-connection-string').parse;


/**
 * Получение текущего хоста
 * @returns {string}
 */
exports.getCurrentHost = function() {
    return process.pid;
}

/**
 * заголовок для авторизации
 * @returns строка
 */
exports.getAuthorizationHeader = function() {
    return "rpc-authorization";
}

/**
 * Применение значений к тексту
 * @param {string} text - текстовая строка 
 * @param {any} values - значения для подстановки
 * 
 * @returns {string} отформатированная строка
 */
exports.applyValues = function(text, values) {
    if(values) {
        for (var val in values) {
            text = text.replace(new RegExp(`\%${val}\%`, 'gi'), values[val]);
        }
    } 

    return text;
}

exports.normal_conn_str = function(connection_string) {
    if(connection_string.indexOf('postgres://') >= 0) {
        var config = parse(connection_string)

        return `host:${config.host};port:${config.port};user:${config.user};password:${config.password};database:${config.database}`;
    } else {
        return connection_string;
    }
}