/**
 * @file modules/rpc/modules/accesses-cacher.js
 * @project skr-rpc-service
 * @author Александр
 */

var db = require('../../dbcontext');
var args = require('../../conf')();
const NodeCache = require("node-cache");

/**
 * период времени для хранение ключа в кэш (секунды)
 * @type {number}
 * @default 60
 */
var access_buffer_expire = args.access_buffer_expire || 30;
var access_checkperiod = args.access_checkperiod || 60;

const myCache = new NodeCache({ stdTTL: access_buffer_expire, checkperiod: access_checkperiod, deleteOnExpire: true });

/**
 * получение списка безопасностей
 * @param {number} user_id идентификатор пользователя
 * @param {function} callback функция обратного вызова
 */
exports.getAccesses = function (user_id, callback) {
    var result = myCache.has(user_id) ? myCache.get(user_id) : null;

    if (!result) {
        // добавляем пользователя в кэш
        db.func('core', 'pf_accesses', null).Query({params: {
            n_user_id: user_id
        }}, (result) => {
            if (result.meta.success == false)
                callback(result);
            else {
                var data = convertResult(result);
                myCache.set(user_id, data);
                callback(data);
            }
        });
    } else {
        // обновляем
        myCache.set(user_id, result);
        callback(result);
    }
}

exports.getTableState = getTableState;

function getTableState(isFrom, user, callback) {
    if(isFrom == true) {
        db.func('dbo', 'of_mui_sd_table_change', { user: user }).Select({
            params:['']
        }, function(res) {
            var data = {};
            for(var i in res.result.records) {
                data[res.result.records[i].c_table_name] = res.result.records[i].n_change;
            }

            callback(data);
        });
    } else {
        callback(null);
    }
}

function convertResult(result) {
    if (result.meta.success) {
        var accesses = {
            isDeletable: null,
            tables: null,
            access: {},
            delete: {},
            method: {
                Add: {},
                Update: {},
                AddOrUpdate: {},
                Delete: {},
                Query: {},
                Select: {},
                Count: {}
            },
            criteria: {},
            rpc_function: [],
            columns: {},
            getTable: function (schema, name) {
                if (this.tables) {
                    return this.tables[name];
                } else {
                    this.tables = {};
                    var me = this;
                    schema.tables.forEach(function (i) {
                        me.tables[i.TABLE_NAME] = i;
                    });
                    return this.tables[name];
                }
            },
            getIsDeletable: function (action, schema) {
                if (this.isDeletable) {
                    return this.isDeletable[action] == true;
                } else {
                    this.isDeletable = {};
                    var me = this;
                    schema.tables.forEach(function (i) {
                        var fields = i.FIELDS;
                        var field = fields.filter((j) => {
                            return j.COLUMN_NAME == 'sn_delete';
                        });

                        me.isDeletable[i.TABLE_NAME] = field.length > 0;
                    });
                    return this.isDeletable[action] == true;
                }
            }
        };

        result.result.records.forEach(function (item) {
            if (item.access > 0 && (item.table_name || item.rpc_function))
                accesses.access[item.table_name] = {};

            if (item.is_deletable == true && item.is_fullcontrol == true)
                accesses.delete[item.table_name] = true;

            if (item.is_deletable == true && item.is_fullcontrol == false)
                accesses.delete[item.table_name] = false;

            if (item.is_creatable == true)
                accesses.method['Add'][item.table_name] = true;

            if (item.is_editable == true)
                accesses.method['Update'][item.table_name] = true;

            if (item.is_editable == true && item.is_creatable == true)
                accesses.method['AddOrUpdate'][item.table_name] = true;

            if (item.is_deletable == true)
                accesses.method['Delete'][item.table_name] = true;

            accesses.method['Select'][item.table_name] = true;
            accesses.method['Query'][item.table_name] = true;
            accesses.method['Count'][item.table_name] = true;

            if (item.rpc_function)
                accesses.rpc_function.push(item);

            if (item.record_criteria != undefined && item.record_criteria != null && item.record_criteria.trim() != '' && item.access > 0) {
                if (!accesses.criteria[item.table_name]) {
                    accesses.criteria[item.table_name] = [];
                }
                accesses.criteria[item.table_name].push(item);
            }

            if (item.access > 0 && item.column_name) {
                if (!accesses.columns[item.table_name]) {
                    accesses.columns[item.table_name] = [];
                }
                accesses.columns[item.table_name].push(item);
            }
        });
        return accesses;
    }
    return null;
}

exports.clearAccesses = function(user_id) {
    if(user_id) {
        myCache.del(user_id);
    } else {
        myCache.flushAll();
        myCache.flushStats();
    }
}