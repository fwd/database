// Migration: test_migration
// Created: 2025-10-13T02:13:47.748Z

module.exports = {
    up: async (db) => {
        // Add your migration logic here
        // Example:
        // await new Promise((resolve, reject) => {
        //     db.run('CREATE TABLE IF NOT EXISTS example (id INTEGER PRIMARY KEY, name TEXT)', (err) => {
        //         if (err) reject(err)
        //         else resolve()
        //     })
        // })
    },
    
    down: async (db) => {
        // Add your rollback logic here
        // Example:
        // await new Promise((resolve, reject) => {
        //     db.run('DROP TABLE IF EXISTS example', (err) => {
        //         if (err) reject(err)
        //         else resolve()
        //     })
        // })
    }
}
