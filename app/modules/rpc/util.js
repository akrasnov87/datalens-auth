/**
 * @file modules/rpc/util.js
 * @project skr-rpc-service
 * @author Александр
 */

var logjs = require('../log');
var layout = require('mobnius-pg-dbcontext/modules/result-layout');

/**
 * вызываем обработчик для вывода ошибок в запросе
 * @param {any} res response
 * @param {string} message строка с ошибкой
 * @param {string} fullMessage полный текст сообшения
 */
exports.failResponse = function (res, message, fullMessage) {
    logjs.error(message + ' ' + (fullMessage || ''));
    res.json({
        meta: {
            success: false,
            msg: message,
            fullMsg: fullMessage
        }
    });
}

/**
 * вызываем обработчик для возвращения положительного результата
 * @param {any} res response
 * @param {any} data данные
 */
exports.successResponse = function (res, data) {
    res.json(layout.ok(data));
}


/**
 * Сущность поддерживает фильтрацию по организации
 * @param {string} schema схема
 * @param {string} tableName имя таблицы
 * @returns {boolean} true - содержит колонку для хранения организации 
 */
 exports.isOrgFilter = function(schema, tableName) {

    if(global.schemas.org[tableName]) {
        return global.schemas.org[tableName].f_org;
    }

    var table = global.schemas.map[schema][tableName];

    if (table && table.TABLE_TYPE == "BASE TABLE") {
        for(var i in table.FIELDS) {
            var field = table.FIELDS[i];
            if(field.COLUMN_NAME == 'f_org') {

                if(!global.schemas.org[tableName]) {
                    global.schemas.org[tableName] = {
                        f_org: true
                    };
                }

                return true;
            }
        }
    }

    if(!global.schemas.org[tableName]) {
        global.schemas.org[tableName] = {
            f_org: false
        };
    }

    return false;
}

/**
 * Сущность поддерживает историю изменения
 * @param {string} schema схема
 * @param {string} tableName имя таблицы
 * @returns {boolean} true - содержит колонки для хранения истории 
 */
 exports.isJournal = function(schema, tableName) {
    if(global.schemas.jrnl[tableName]) {
        return global.schemas.jrnl[tableName].c_change_user;
    }

    var table = global.schemas.map[schema][tableName];

    if (table && table.TABLE_TYPE == "BASE TABLE") {
        for(var i in table.FIELDS) {
            var field = table.FIELDS[i];
            if(field.COLUMN_NAME == 'c_change_user') {

                if(!global.schemas.jrnl[tableName]) {
                    global.schemas.jrnl[tableName] = {
                        c_change_user: true
                    };
                }

                return true;
            }
        }
    }

    if(!global.schemas.jrnl[tableName]) {
        global.schemas.jrnl[tableName] = {
            c_change_user: false
        };
    }

    return false;
}

exports.getOrgId = function(user) {
    return user.f_org || user.id;
}