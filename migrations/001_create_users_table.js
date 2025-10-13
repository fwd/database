// Migration: Create users table
// Created: 2024-01-01T00:00:00.000Z

module.exports = {
    up: async (db) => {
        await new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    active INTEGER DEFAULT 1
                )
            `, (err) => {
                if (err) reject(err)
                else resolve()
            })
        })
        
        // Create index for faster email lookups
        await new Promise((resolve, reject) => {
            db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)', (err) => {
                if (err) reject(err)
                else resolve()
            })
        })
    },
    
    down: async (db) => {
        await new Promise((resolve, reject) => {
            db.run('DROP INDEX IF EXISTS idx_users_email', (err) => {
                if (err) reject(err)
                else resolve()
            })
        })
        
        await new Promise((resolve, reject) => {
            db.run('DROP TABLE IF EXISTS users', (err) => {
                if (err) reject(err)
                else resolve()
            })
        })
    }
}
