/**
 * @file modules/custom-context/shell.js
 * @project skr-rpc-service
 * @author Александр
 */

/**
 * объект для формирования ответа
 */
var result_layout = require('mobnius-pg-dbcontext/modules/result-layout');

/**
 * Объект с набором RPC функций
 */
exports.shell = function (session) {

    return {

        /**
         * Получение серверного времени
         * @param {*} data 
         * @param {*} callback 
         * 
         * @example
         * [{ action: "shell", method: "servertime", data: [{ }], type: "rpc", tid: 0 }]
         */
        servertime: function (data, callback) {
            callback(result_layout.ok([{ date: new Date() }]));
        }
    }
}