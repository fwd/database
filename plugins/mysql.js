const mysql = require('mysql');

module.exports = (config) => {

    // Create a MySQL connection pool using the provided configuration
    const pool = mysql.createPool(config);

    return {
        list(model) {
            return new Promise((resolve, reject) => {
                pool.query(`SELECT * FROM ${model}`, (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                });
            });
        },

        get(model, id) {
            return new Promise((resolve, reject) => {
                pool.query(`SELECT * FROM ${model} WHERE id = ?`, [id], (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results[0]);
                    }
                });
            });
        },

        findFirst(model, query) {
            return new Promise((resolve, reject) => {
                pool.query(`SELECT * FROM ${model} WHERE ? LIMIT 1`, query, (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results[0]);
                    }
                });
            });
        },

        findLast(model, query) {
            return new Promise((resolve, reject) => {
                pool.query(`SELECT * FROM ${model} WHERE ? ORDER BY id DESC LIMIT 1`, query, (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results[0]);
                    }
                });
            });
        },

        findOne(model, query) {
            return new Promise((resolve, reject) => {
                pool.query(`SELECT * FROM ${model} WHERE ? LIMIT 1`, query, (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results[0]);
                    }
                });
            });
        },

        paginate(model, query) {
            // Implement pagination logic using query parameters
        },

        find(model, query) {
            return new Promise((resolve, reject) => {
                pool.query(`SELECT * FROM ${model} WHERE ?`, query, (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                });
            });
        },

        create(model, value) {
            return new Promise((resolve, reject) => {
                pool.query(`INSERT INTO ${model} SET ?`, value, (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results.insertId);
                    }
                });
            });
        },

        update(model, id, update) {
            return new Promise((resolve, reject) => {
                pool.query(`UPDATE ${model} SET ? WHERE id = ?`, [update, id], (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results.affectedRows > 0);
                    }
                });
            });
        },

        set(model, value) {
            // Implement your custom logic to set data in the model
        },

        remove(model, id) {
            return new Promise((resolve, reject) => {
                pool.query(`DELETE FROM ${model} WHERE id = ?`, [id], (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results.affectedRows > 0);
                    }
                });
            });
        },
    };
};
