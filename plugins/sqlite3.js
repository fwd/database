const fs = require('fs')
const sqlite3 = require('sqlite3')

function uuid() {
    return `xxxxxxxxxxxxxxxxxxxxxxxxxx`.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

module.exports = (config) => {

    if (typeof config === 'string') config = { name: config }

    const base_path = config.file || config.name || config.filepath || config.base_path || config.basepath || config.database || config.namespace || config.path || 'database.sqlite'
    
    config.created_key = config.created_key || 'created_at'
    config.updated_key = config.updated_key || 'updated_at'

    if (base_path !== 'memory' && base_path !== ':memory:') {
     
        if (!fs.existsSync(base_path)) {
          try {
            fs.writeFileSync(base_path, '', 'utf-8')
          } catch (err) {}
        }

    }

    if (base_path === 'memory') base_path = ':memory:'

    const db = new sqlite3.Database(base_path)

    const runMigrations = async () => {
        if (config.migrations && Array.isArray(config.migrations)) {
            for (const migration of config.migrations) {
                try {
                    await migration(db)
                } catch (err) {
                    console.error('Error running migration:', err)
                }
            }
        }
    }

    const createTable = async (model, columns) => {
        return new Promise((resolve, reject) => {
            const columnDefinitions = columns.map(column => `${column} TEXT`).join(', ')
            const createTableQuery = `CREATE TABLE "${model}" (id INTEGER PRIMARY KEY, ${columnDefinitions})`
            db.run(createTableQuery, async (err) => {
                if (err) {
                    reject(err)
                } else {
                    try {
                        await runMigrations()
                        resolve()
                    } catch (err) {
                        reject(err)
                    }
                }
            })
        })
    }

    const methods = {
        
        raw(query, params) {
            return new Promise((resolve, reject) => {
                db.all(query, params, (err, rows) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(rows)
                    }
                })
            })
        },

        list(model) {
            return new Promise((resolve, reject) => {
                const query = `SELECT * FROM ${model}`
                db.all(query, (err, rows) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(rows)
                    }
                })
            })
        },

        findFirst(model, query) {
            return new Promise((resolve, reject) => {
                if (!query || Object.keys(query).length === 0) {
                    const queryString = `SELECT * FROM ${model} LIMIT 1`
                    db.get(queryString, (err, row) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(row)
                        }
                    })
                } else {
                    const keys = Object.keys(query)
                    const conditions = keys.map(key => `${key} = ?`).join(' AND ')
                    const values = keys.map(key => query[key])
                    const queryString = `SELECT * FROM ${model} WHERE ${conditions} LIMIT 1`
                    db.get(queryString, values, (err, row) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(row)
                        }
                    })
                }
            })
        },

        findLast(model, query) {
            return new Promise((resolve, reject) => {
                const keys = Object.keys(query)
                const conditions = keys.map(key => `${key} = ?`).join(' AND ')
                const values = keys.map(key => query[key])
                const queryString = `SELECT * FROM ${model} WHERE ${conditions} ORDER BY id DESC LIMIT 1`
                db.get(queryString, values, (err, row) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(row)
                    }
                })
            })
        },

        findOne(model, query) {
            return new Promise((resolve, reject) => {
                if (!query || Object.keys(query).length === 0) {
                    const queryString = `SELECT * FROM ${model} LIMIT 1`
                    db.get(queryString, (err, row) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(row)
                        }
                    })
                } else {
                    if (typeof query === 'number') query = { id: query }
                    const keys = Object.keys(query)
                    const conditions = keys.map(key => `${key} = ?`).join(' AND ')
                    const values = keys.map(key => query[key])
                    const queryString = `SELECT * FROM ${model} WHERE ${conditions} LIMIT 1`
                    db.get(queryString, values, (err, row) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(row)
                        }
                    })
                }
            })
        },

        // TODO
        // paginate(model, query) {
        // },

        find(model, query) {
            return new Promise((resolve, reject) => {
                if (!query || Object.keys(query).length === 0) {
                    const queryString = `SELECT * FROM ${model}`
                    db.all(queryString, (err, rows) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(rows)
                        }
                    })
                } else {
                    const keys = Object.keys(query)
                    const conditions = keys.map(key => `${key} = ?`).join(' AND ')
                    const values = keys.map(key => query[key])
                    const queryString = `SELECT * FROM ${model} WHERE ${conditions}`
                    db.all(queryString, values, (err, rows) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(rows)
                        }
                    })
                }
            })
        },

        create(model, value) {
            var self = this
            return new Promise((resolve, reject) => {
                if (value && !value.id && !value.uuid) value.uuid = uuid()
                if (value && !value[config.created_key]) value[config.created_key] = String(new Date().getTime())
                if (value && !value[config.updated_key]) value[config.updated_key] = String(new Date().getTime())
                const keys = Object.keys(value)
                const placeholders = keys.map(() => '?').join(', ')
                const queryString = `INSERT INTO "${model}" (${keys.join(', ')}) VALUES (${placeholders})`
                db.run(queryString, Object.values(value), function (err) {
                    if (err) {
                        if (err.message.includes("no such table")) {
                            self.createTable(model, keys)
                                .then(() => {
                                    return self.create(model, value)
                                })
                                .then(resolve)
                                .catch(reject)
                        } else {
                            reject(err)
                        }
                    } else {
                        value.id = this.lastID
                        resolve(value)
                    }
                })
            })
        },

        createTable,

        update(model, id, update) {
            return new Promise((resolve, reject) => {
                update[config.updated_key] = new Date().getTime()
                const keys = Object.keys(update)
                const setValues = keys.map(key => `${key} = ?`).join(', ')
                const queryString = `UPDATE ${model} SET ${setValues} WHERE id = ?`
                db.run(queryString, [...Object.values(update), id], function (err) {
                    if (err) {
                        reject(err)
                    } else {
                        resolve({ affectedRows: this.changes })
                    }
                })
            })
        },

        set(model, value) {
            return new Promise((resolve, reject) => {
                const id = value.id
                if (!id) {
                    reject(new Error('ID is required to update the record.'))
                    return
                }
                const update = { ...value }
                delete update.id // Remove id from update object
                update[config.updated_key] = new Date().getTime()
                const keys = Object.keys(update)
                const setValues = keys.map(key => `${key} = ?`).join(', ')
                const queryString = `UPDATE ${model} SET ${setValues} WHERE id = ?`
                db.run(queryString, [...Object.values(update), id], function(err) {
                    if (err) {
                        reject(err)
                    } else {
                        resolve({ affectedRows: this.changes })
                    }
                })
            })
        },

        remove(model, id) {
            return new Promise((resolve, reject) => {
                const queryString = `DELETE FROM ${model} WHERE id = ?`
                db.run(queryString, [id], function (err) {
                    if (err) {
                        reject(err)
                    } else {
                        resolve({ affectedRows: this.changes })
                    }
                })
            })
        },

    }

    // aliases
    methods.get = methods.find
    methods.delete = methods.remove
    methods.getFirst = methods.findFirst
    methods.getLast = methods.findLast

    return methods

}
