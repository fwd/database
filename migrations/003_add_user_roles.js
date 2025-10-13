// Migration: Add user roles and permissions
// Created: 2024-01-01T00:00:00.000Z

module.exports = {
    up: async (db) => {
        // Add role column to users table
        await new Promise((resolve, reject) => {
            db.run('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"', (err) => {
                if (err) reject(err)
                else resolve()
            })
        })
        
        // Create roles table
        await new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS roles (
                    id INTEGER PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    permissions TEXT, -- JSON array of permissions
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            `, (err) => {
                if (err) reject(err)
                else resolve()
            })
        })
        
        // Insert default roles
        const defaultRoles = [
            { name: 'admin', description: 'Administrator', permissions: '["read", "write", "delete", "admin"]' },
            { name: 'user', description: 'Regular user', permissions: '["read"]' },
            { name: 'moderator', description: 'Moderator', permissions: '["read", "write"]' }
        ]
        
        for (const role of defaultRoles) {
            await new Promise((resolve, reject) => {
                const now = new Date().toISOString()
                db.run(`
                    INSERT OR IGNORE INTO roles (name, description, permissions, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                `, [role.name, role.description, role.permissions, now, now], (err) => {
                    if (err) reject(err)
                    else resolve()
                })
            })
        }
    },
    
    down: async (db) => {
        // Drop roles table
        await new Promise((resolve, reject) => {
            db.run('DROP TABLE IF EXISTS roles', (err) => {
                if (err) reject(err)
                else resolve()
            })
        })
        
        // Note: SQLite doesn't support DROP COLUMN easily
        // In production, you'd need to recreate the table without the role column
        console.log('⚠️  Note: role column still exists in users table. Manual cleanup required.')
    }
}
