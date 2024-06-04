/**
 * @file modules/log/index.js
 * @project skr-rpc-service
 * @author Александр Краснов
 */

const process = require('process');
const args = require('../conf')();
var moment = require('moment');

var pool = null;

function write2db(obj) {
    if(pool != null) {
        pool.query(`INSERT INTO core.sd_logs(d_date, d_time, jb_data) VALUES($1, $2, $3)`, [new Date(), moment(new Date()).format("HH:mm:ss.SSS Z"), obj], function (err, rows, time) {
            if(err) {
                console.log(`${new Date().toISOString()}\tERROR\tWRITE_LOG\t${err.stack}\tnull\t${process.pid}\tnull\t${time}\tnull`);
            }
        });
    }
}

exports.initPG = function() {
    pool = require('mobnius-pg-dbcontext/modules/pool-connection-db');
}

/**
 * Лог
 * @param {string} message текст
 * @param {string} category категория
 */
exports.log = function (message, category, userId, claims, duration, size) {
    message = (message || '').replace(/\t/g, '\n\n');
    category = category || 'UNKNOWN';  

    userId = userId || null
    claims = claims || null
    duration = duration || null
    size = size || null

    console.log(`${new Date().toISOString()}\tLOG\t${category}\t${message}\t${userId}\t${process.pid}\t${claims}\t${duration}\t${size}`);

    write2db({
        type: 'LOG',
        category: category,
        message: message,
        userId: userId,
        pid: process.pid,
        claims: claims,
        duration: duration,
        size: size,
        app: 'NODEJS'
    });
}   

/**
 * Отладка
 * @param {string} message текст
 * @param {string} category категория
 */
exports.debug = function (message, category, userId, claims, duration, size, name) {
    if(args.debug) {
        message = (message || '').replace(/\t/g, '\n\n');
        category = category || 'UNKNOWN';

        userId = userId || null
        claims = claims || null
        duration = duration || null
        size = size || null
        name = name || null
        
        console.log(`${new Date().toISOString()}\tDEBUG\t${category}\t${message}\t${userId}\t${process.pid}\t${claims}\t${duration}\t${size}\t${name}`);

        write2db({
            type: 'DEBUG',
            category: category,
            message: message,
            userId: userId,
            pid: process.pid,
            claims: claims,
            duration: duration,
            size: size,
            name: name,
            app: 'NODEJS'
        });
    }
}

/**
 * Ошибка
 * @param {string} message текст
 * @param {string} category категория
 */
exports.error = function (message, category, userId, claims, duration, size) {
    message = (message || '').replace(/\t/g, '\n\n');
    category = category || 'UNKNOWN';
 
    userId = userId || null
    claims = claims || null
    duration = duration || null
    size = size || null

    console.log(`${new Date().toISOString()}\tERROR\t${category}\t${message}\t${userId}\t${process.pid}\t${claims}\t${duration}\t${size}`);

    write2db({
        type: 'ERROR',
        category: category,
        message: message,
        userId: userId,
        pid: process.pid,
        claims: claims,
        duration: duration,
        size: size,
        app: 'NODEJS'
    });
}
