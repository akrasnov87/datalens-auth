var connect_pg = null;
var timers = {};
var startDate = null;

var mainTimeOut;
var mainInterval;

module.exports = function (callback) { 
    connect_pg = require('mobnius-pg-dbcontext/modules/pool-connection-db');

    if(connect_pg != null) {
        connect_pg.query(`
    SELECT
        nspname,
        proname
    FROM pg_catalog.pg_proc AS pr
    JOIN pg_catalog.pg_namespace AS ns ON ns.oid = pr.pronamespace
    WHERE nspname = 'public' AND prosrc ILIKE '%sf_timer_%'`, null, function (err, rows, time) {
            if(err) {
                console.log(`${new Date().toISOString()}\tERROR\tTIMER\t${err.stack}\tnull\t${process.pid}\tnull\t${time}\tnull`);
            } else {
                for(var i in rows.rows) {
                    var item = rows.rows[i];
                    var segments = item.proname.split('_');
                    timers[segments[segments.length - 1]] = item;
                }
            }

            var year = new Date().getFullYear();
            var month = new Date().getMonth();
            var date = new Date().getDate();

            startDate = new Date(year, month, date);
            
            // делаем задержку на указанное значение
            var ms = (60 * 1000) - (new Date().getTime() - new Date(year, month, date, new Date().getHours(), new Date().getMinutes()));
            mainTimeOut = setTimeout(()=>{
                mainInterval = setInterval(() => {
                    next(callback);
                }, 60 * 1000);
            }, ms);
        });
    }
}

function next(callback) {
    var ms = new Date().getTime() - startDate.getTime();
    var seconds = parseInt(ms / 1000);

    for(var i in timers) {
        if(seconds % parseInt(i) == 0) {
            if(connect_pg != null) {
                connect_pg.query(`SELECT ${timers[i].nspname}.${timers[i].proname}($1)`, [null], function (err, rows, time) {
                    if(err) {
                        console.log(`${new Date().toISOString()}\tERROR\tTIMER\t${err.stack}\tnull\t${process.pid}\tnull\t${time}\tnull`);
                    } else {
                        console.log(`${new Date().toISOString()}\tDEBUG\tTIMER\tOK ${parseInt(i)}\tnull\t${process.pid}\tnull\t${time}\tnull`);

                        if(typeof callback == 'function') {
                            callback(parseInt(i));
                        }
                    }
                });
            }
        }
    }
}