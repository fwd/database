var jsonSql = require('json-sql')()

const sqlite3 = require('sqlite3')
const sqlite = require('sqlite')

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// @todo manual table creation (schema file)
// @todo automatic table creation

module.exports = (config) => {

    config = config || {}
    
    const base_path = config.filepath || config.base_path || config.basepath || config.path
    const database_name = config.database || config.filename || config.namespace
    const path = base_path ? base_path : './'
    const database = database_name ? database_name.replace('.db', '') + '.db' : 'database.db'

    return {
        raw(query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        list(model) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        find(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        get(model, query) {
            return new Promise(async (resolve, reject) => {
                const db = await sqlite.open({
                    filename: base_path || `${path}${database}`,
                    driver: config.driver || sqlite3.Database
                })
                var sql = jsonSql.build({
                    type: 'insert',
                    table: 'users',
                    values: {
                        name: 'John',
                        lastname: 'Snow',
                        age: 24,
                        gender: 'male'
                    }
                });
                resolve( await db.run(sql.query, sql.values) )
            })
        },
        getFirst(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        getLast(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        findFirst(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        findLast(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        findOne(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        paginate(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        create(model, value) {
            return new Promise(async (resolve, reject) => {
                const db = await sqlite.open({
                    filename: base_path || `${path}${database}`,
                    driver: config.driver || sqlite3.Database
                })
                if (!value.id) value.id = uuidv4()
                var sql = jsonSql.build({
                    type: 'insert',
                    table: model,
                    values: value
                });
                resolve( sql.query )
                // resolve( await db.run(sql.query, sql.values) )
            })
        },
        update(model, id, update) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        set(model, value) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        remove(model, id) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        delete(model, id) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
    }
}
