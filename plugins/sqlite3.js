const sqlite3 = require('sqlite3').verbose();

module.exports = (config) => {
    
    const base_path = config.filepath || config.base_path || config.basepath;

    const db = new sqlite3.Database(base_path || ':memory:');

    // Create a table for the given model
    const createTable = (model) => {
        return new Promise((resolve, reject) => {
            const createTableQuery = `CREATE TABLE IF NOT EXISTS ${model} (id INTEGER PRIMARY KEY, data TEXT)`;
            db.run(createTableQuery, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    };

    return {
        list: (model) => {
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
        get: (model, id) => {
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
        create: (model, value) => {
            return createTable(model).then(() => {
                return new Promise((resolve, reject) => {
                    const insertQuery = `INSERT INTO ${model} (data) VALUES (?)`;
                    db.run(insertQuery, [JSON.stringify(value)], function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ id: this.lastID });
                        }
                    });
                });
            });
        },
        update: (model, id, update) => {
            return new Promise((resolve, reject) => {
                const updateQuery = `UPDATE ${model} SET data = ? WHERE id = ?`;
                db.run(updateQuery, [JSON.stringify(update), id], function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                });
            });
        },
        remove: (model, id) => {
            return new Promise((resolve, reject) => {
                const deleteQuery = `DELETE FROM ${model} WHERE id = ?`;
                db.run(deleteQuery, [id], function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                });
            });
        },
    };
};
