const fs = require('fs');
const sqlite3 = require('sqlite3');

function uuid() {
    return `xxxxxxxxxxx`.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16)
    })
}

module.exports = (config) => {

    if (typeof config === 'string') config = { name: config }

    const base_path = config.name || config.filepath || config.base_path || config.basepath || config.namespace || config.path;
    
    config.created_key = config.created_key || 'created_at'
    config.updated_key = config.updated_key || 'updated_at'

    if (base_path !== 'memory' && base_path !== ':memory:') {
     
        if (!fs.existsSync(base_path)) {
          // If the file doesn't exist, create it synchronously
          try {
            fs.writeFileSync(base_path, '', 'utf-8');
            // console.log('File created successfully');
          } catch (err) {
            // console.error('Error creating file:', err);
          }
        }

    }

    if (base_path === 'memory') base_path = ':memory:'

    const db = new sqlite3.Database(base_path);

    return {
        list(model) {
            return new Promise((resolve, reject) => {
                const query = `SELECT * FROM ${model}`;
                db.all(query, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });
        },

        get(model, id) {
            return new Promise((resolve, reject) => {
                const query = `SELECT * FROM ${model} WHERE id = ?`;
                db.get(query, [id], (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });
        },

        findFirst(model, query) {
            return new Promise((resolve, reject) => {
                const keys = Object.keys(query);
                const conditions = keys.map(key => `${key} = ?`).join(' AND ');
                const values = keys.map(key => query[key]);

                const queryString = `SELECT * FROM ${model} WHERE ${conditions} LIMIT 1`;

                db.get(queryString, values, (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });
        },

        findLast(model, query) {
            return new Promise((resolve, reject) => {
                const keys = Object.keys(query);
                const conditions = keys.map(key => `${key} = ?`).join(' AND ');
                const values = keys.map(key => query[key]);

                const queryString = `SELECT * FROM ${model} WHERE ${conditions} ORDER BY id DESC LIMIT 1`;

                db.get(queryString, values, (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });
        },

        findOne(model, query) {
            return new Promise((resolve, reject) => {

                if (typeof query === 'number') query = { id: query }

                const keys = Object.keys(query);
                const conditions = keys.map(key => `${key} = ?`).join(' AND ');
                const values = keys.map(key => query[key]);

                const queryString = `SELECT * FROM ${model} WHERE ${conditions} LIMIT 1`;

                db.get(queryString, values, (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });
        },

        paginate(model, query) {
            // You would need to implement pagination logic here based on your specific requirements.
            // This could involve using LIMIT and OFFSET in your SQL queries.
        },

        find(model, query) {
            return new Promise((resolve, reject) => {
                const keys = Object.keys(query);
                const conditions = keys.map(key => `${key} = ?`).join(' AND ');
                const values = keys.map(key => query[key]);

                const queryString = `SELECT * FROM ${model} WHERE ${conditions}`;

                db.all(queryString, values, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });
        },

        create(model, value) {
            var self = this
            return new Promise((resolve, reject) => {
                if (value && !value.id) value.uuid = uuid()
                if (value && !value[config.created_key]) value[config.created_key] = String(new Date().getTime())
                if (value && !value[config.updated_key]) value[config.updated_key] = String(new Date().getTime())
                const keys = Object.keys(value);
                const placeholders = keys.map(() => '?').join(', ');
                const queryString = `INSERT INTO "${model}" (${keys.join(', ')}) VALUES (${placeholders})`;
                db.run(queryString, Object.values(value), function (err) {
                    if (err) {
                        // Check if the error is related to "no such table"
                        if (err.message.includes("no such table")) {
                            // If the table doesn't exist, create it and retry the insertion
                            self.createTable(model, keys)
                                .then(() => {
                                    // Retry the insertion after creating the table
                                    return self.create(model, value);
                                })
                                .then(resolve)
                                .catch(reject);
                        } else {
                            // If it's not a "no such table" error, reject with the original error
                            reject(err);
                        }
                    } else {
                        value.id = this.lastID
                        resolve(value);
                    }
                });
            });
        },

        createTable(model, columns) {
            return new Promise((resolve, reject) => {
                const columnDefinitions = columns.map(column => `${column} TEXT`).join(', ');
                const createTableQuery = `CREATE TABLE "${model}" (id INTEGER PRIMARY KEY, ${columnDefinitions})`;

                db.run(createTableQuery, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        },

        update(model, id, update) {
            return new Promise((resolve, reject) => {
                update[config.updated_key] = new Date().getTime()
                const keys = Object.keys(update);
                const setValues = keys.map(key => `${key} = ?`).join(', ');
                const queryString = `UPDATE ${model} SET ${setValues} WHERE id = ?`;
                db.run(queryString, [...Object.values(update), id], function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ affectedRows: this.changes });
                    }
                });
            });
        },

        set(model, value) {
            // You need to implement logic to set a value in the SQLite database based on your requirements.
        },

        remove(model, id) {
            return new Promise((resolve, reject) => {
                const queryString = `DELETE FROM ${model} WHERE id = ?`;

                db.run(queryString, [id], function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ affectedRows: this.changes });
                    }
                });
            });
        },
    };
};
