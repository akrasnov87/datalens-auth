/**
 * @file modules/utils.js
 * @project skr-rpc-service
 * @author Александр Краснов
 */

var args = require('./conf')();
const process = require('process');


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