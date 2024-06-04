/**
 * @file modules/authorize/util.js
 * @project skr-rpc-service
 * @author Александр
 * @todo утилиты для авторизации
 */

/**
 * возвращается модуль для авторизации, по умолчанию basic
 * @param {string} authType тип авторизации, например basic
 * @returns {any}
 * @example
 * getAuthModule('basic');
 */
exports.getAuthModule = function (authType) {
    var type = null;
    switch (authType) {
        case 'basic':
        default:
            type = require('./basic-authorize');
            break;
    }
    return type;
}

/**
 * установка пользователя в response
 * @param {any} res response
 * @param {any} user пользователь
 */
exports.setResponseUser = function (res, user) {
    res.user = user;
    res.isAuthorize = true;
}