const fs = require('fs')
const path = require('path')
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

    // Migration system
    const MIGRATIONS_TABLE = '__migrations__'
    
    const initMigrationsTable = async () => {
        return new Promise((resolve, reject) => {
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
                    id INTEGER PRIMARY KEY,
                    filename TEXT UNIQUE NOT NULL,
                    executed_at TEXT NOT NULL,
                    checksum TEXT NOT NULL
                )
            `
            db.run(createTableQuery, (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    const getExecutedMigrations = async () => {
        return new Promise((resolve, reject) => {
            const query = `SELECT filename, checksum FROM "${MIGRATIONS_TABLE}" ORDER BY id`
            db.all(query, (err, rows) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(rows || [])
                }
            })
        })
    }

    const markMigrationAsExecuted = async (filename, checksum) => {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO "${MIGRATIONS_TABLE}" (filename, executed_at, checksum) 
                VALUES (?, ?, ?)
            `
            const executedAt = new Date().toISOString()
            db.run(query, [filename, executedAt, checksum], (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    const calculateFileChecksum = (content) => {
        const crypto = require('crypto')
        return crypto.createHash('md5').update(content).digest('hex')
    }

    const getMigrationsPath = () => {
        // Priority order for migrations path:
        // 1. Explicit config.migrationsPath
        // 2. config.migrations_dir (alternative naming)
        // 3. config.migrationsDir (camelCase alternative)
        // 4. Default './migrations'
        
        return config.migrationsPath || 
               config.migrations_dir || 
               config.migrationsDir || 
               './migrations'
    }

    const loadMigrationFiles = async () => {
        const migrationsPath = getMigrationsPath()
        
        // If a specific path is configured, try it first
        if (config.migrationsPath || config.migrations_dir || config.migrationsDir) {
            if (fs.existsSync(migrationsPath)) {
                if (config.debug) {
                    console.log(`📁 Loading migrations from: ${migrationsPath}`)
                }
                return await loadMigrationsFromPath(migrationsPath)
            } else {
                if (config.debug) {
                    console.log(`📁 No migrations directory found at: ${migrationsPath}`)
                }
                
                // If configured path doesn't exist, try fallback paths
                const possiblePaths = [
                    './migrations',
                    './db/migrations',
                    './database/migrations',
                    path.join(process.cwd(), 'migrations'),
                    path.join(process.cwd(), 'db', 'migrations')
                ]
                
                let actualPath = null
                for (const testPath of possiblePaths) {
                    if (fs.existsSync(testPath)) {
                        actualPath = testPath
                        break
                    }
                }
                
                if (actualPath) {
                    if (config.debug) {
                        console.log(`📁 Found migrations in fallback directory: ${actualPath}`)
                    }
                    return await loadMigrationsFromPath(actualPath)
                } else {
                    if (config.debug) {
                        console.log(`📁 No migrations directory found in fallback paths: ${possiblePaths.join(', ')}`)
                    }
                    return []
                }
            }
        }
        
        // If no specific path is configured, try fallback paths
        const possiblePaths = [
            './migrations',
            './db/migrations',
            './database/migrations',
            path.join(process.cwd(), 'migrations'),
            path.join(process.cwd(), 'db', 'migrations')
        ]
        
        let actualPath = null
        for (const testPath of possiblePaths) {
            if (fs.existsSync(testPath)) {
                actualPath = testPath
                break
            }
        }
        
        if (!actualPath) {
            // If no migrations directory exists, return empty array
            if (config.debug) {
                console.log(`📁 No migrations directory found. Searched: ${possiblePaths.join(', ')}`)
            }
            return []
        }
        
        if (config.debug) {
            console.log(`📁 Loading migrations from: ${actualPath}`)
        }
        
        return await loadMigrationsFromPath(actualPath)
    }

    const loadMigrationsFromPath = async (migrationsPath) => {
        const files = fs.readdirSync(migrationsPath)
            .filter(file => file.endsWith('.js') || file.endsWith('.sql'))
            .sort() // Ensure migrations run in order

        const migrations = []
        for (const file of files) {
            const filePath = path.join(migrationsPath, file)
            const content = fs.readFileSync(filePath, 'utf8')
            const checksum = calculateFileChecksum(content)
            
            migrations.push({
                filename: file,
                filePath,
                content,
                checksum
            })
        }
        
        return migrations
    }

    const executeMigration = async (migration) => {
        const { filename, filePath, content, checksum } = migration
        
        try {
            if (filePath.endsWith('.js')) {
                // JavaScript migration - use absolute path
                const absolutePath = path.resolve(filePath)
                delete require.cache[absolutePath] // Clear cache to ensure fresh load
                const migrationModule = require(absolutePath)
                if (typeof migrationModule.up === 'function') {
                    await migrationModule.up(db)
                } else if (typeof migrationModule === 'function') {
                    await migrationModule(db)
                } else {
                    throw new Error(`Invalid migration format in ${filename}`)
                }
            } else if (filePath.endsWith('.sql')) {
                // SQL migration
                const statements = content.split(';').filter(stmt => stmt.trim())
                for (const statement of statements) {
                    if (statement.trim()) {
                        await new Promise((resolve, reject) => {
                            db.run(statement.trim(), (err) => {
                                if (err) reject(err)
                                else resolve()
                            })
                        })
                    }
                }
            }
            
            await markMigrationAsExecuted(filename, checksum)
            console.log(`✅ Migration executed: ${filename}`)
            
        } catch (error) {
            console.error(`❌ Migration failed: ${filename}`, error.message)
            throw error
        }
    }

    const runMigrations = async () => {
        try {
            await initMigrationsTable()
            
            // Get executed migrations
            const executedMigrations = await getExecutedMigrations()
            const executedFilenames = new Set(executedMigrations.map(m => m.filename))
            const executedChecksums = new Map(executedMigrations.map(m => [m.filename, m.checksum]))
            
            // Load migration files
            const migrationFiles = await loadMigrationFiles()
            
            // Check for modified migrations
            const modifiedMigrations = []
            for (const migration of migrationFiles) {
                const executedChecksum = executedChecksums.get(migration.filename)
                if (executedChecksum && executedChecksum !== migration.checksum) {
                    modifiedMigrations.push(migration)
                }
            }
            
            if (modifiedMigrations.length > 0) {
                console.warn('⚠️  Warning: The following migrations have been modified since execution:')
                modifiedMigrations.forEach(m => console.warn(`   - ${m.filename}`))
                
                if (config.allowModifiedMigrations !== true) {
                    throw new Error('Modified migrations detected. Set allowModifiedMigrations: true to allow this.')
                }
            }
            
            // Find new migrations
            const newMigrations = migrationFiles.filter(m => !executedFilenames.has(m.filename))
            
            if (newMigrations.length === 0) {
                console.log('✅ All migrations are up to date')
                return
            }
            
            console.log(`🔄 Running ${newMigrations.length} new migration(s)...`)
            
            // Execute new migrations
            for (const migration of newMigrations) {
                await executeMigration(migration)
            }
            
            console.log('✅ All migrations completed successfully')
            
        } catch (error) {
            console.error('❌ Migration system error:', error.message)
            throw error
        }
    }

    // Legacy support for config.migrations array
    const runLegacyMigrations = async () => {
        if (config.migrations && Array.isArray(config.migrations)) {
            console.log('🔄 Running legacy migrations...')
            for (const migration of config.migrations) {
                try {
                    await migration(db)
                } catch (err) {
                    console.error('Error running legacy migration:', err)
                }
            }
            console.log('✅ Legacy migrations completed')
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
                        // Run both migration systems
                        await runMigrations()
                        await runLegacyMigrations()
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

        _paginate(array, limit, page) {
            return array.slice((page - 1) * limit, page * limit)
        },

        paginate(model, query) {
            var self = this
            return new Promise(async (resolve, reject) => {
                try {
                    query = query || {}
                    
                    // Extract pagination parameters
                    var page = query.page || 1
                    var limit = query.limit
                    
                    // Remove pagination parameters from query before passing to find
                    var dbQuery = { ...query }
                    delete dbQuery.page
                    delete dbQuery.limit
                    
                    // Get all records first
                    var files = await self.find(model, dbQuery)
                    
                    // Set limit after getting files (like local.js)
                    if (!limit) {
                        limit = files.length
                    }
                    
                    // Calculate total pages
                    var pages = Math.ceil(files.length / limit)
                    
                    if (pages == 0) {
                        pages = 1
                        page = 1
                    }
                    
                    var response = {
                        page: Number(page),
                        limit: Number(limit),
                        total: files.length,
                        data: self._paginate(files, limit, page),
                        pages: pages
                    }
                    
                    resolve(response)
                } catch (error) {
                    reject(error)
                }
            })
        },

        // Migration utilities
        async runMigrations() {
            return await runMigrations()
        },

        async getMigrationStatus() {
            await initMigrationsTable()
            const executedMigrations = await getExecutedMigrations()
            const migrationFiles = await loadMigrationFiles()
            
            const status = {
                executed: executedMigrations,
                available: migrationFiles,
                pending: [],
                modified: []
            }
            
            const executedFilenames = new Set(executedMigrations.map(m => m.filename))
            const executedChecksums = new Map(executedMigrations.map(m => [m.filename, m.checksum]))
            
            for (const migration of migrationFiles) {
                if (!executedFilenames.has(migration.filename)) {
                    status.pending.push(migration)
                } else {
                    const executedChecksum = executedChecksums.get(migration.filename)
                    if (executedChecksum && executedChecksum !== migration.checksum) {
                        status.modified.push(migration)
                    }
                }
            }
            
            return status
        },

        async createMigration(name) {
            const migrationsPath = getMigrationsPath()
            
            // Ensure migrations directory exists
            if (!fs.existsSync(migrationsPath)) {
                fs.mkdirSync(migrationsPath, { recursive: true })
                if (config.debug) {
                    console.log(`📁 Created migrations directory: ${migrationsPath}`)
                }
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
            const filename = `${timestamp}_${name}.js`
            const filePath = path.join(migrationsPath, filename)
            
            const template = `// Migration: ${name}
// Created: ${new Date().toISOString()}

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
`
            
            fs.writeFileSync(filePath, template)
            console.log(`✅ Migration created: ${filename}`)
            return filePath
        },

        async rollbackMigration(filename) {
            const migrationsPath = getMigrationsPath()
            const filePath = path.join(migrationsPath, filename)
            
            if (!fs.existsSync(filePath)) {
                throw new Error(`Migration file not found: ${filename}`)
            }
            
            const absolutePath = path.resolve(filePath)
            delete require.cache[absolutePath] // Clear cache to ensure fresh load
            const migrationModule = require(absolutePath)
            if (typeof migrationModule.down === 'function') {
                await migrationModule.down(db)
                
                // Remove from executed migrations
                await new Promise((resolve, reject) => {
                    const query = `DELETE FROM "${MIGRATIONS_TABLE}" WHERE filename = ?`
                    db.run(query, [filename], (err) => {
                        if (err) reject(err)
                        else resolve()
                    })
                })
                
                console.log(`✅ Migration rolled back: ${filename}`)
            } else {
                throw new Error(`Migration ${filename} does not have a down function`)
            }
        },

        // Get the current migrations path being used
        getMigrationsPath() {
            return getMigrationsPath()
        }

    }

    // aliases
    methods.get = methods.find
    methods.delete = methods.remove
    methods.getFirst = methods.findFirst
    methods.getLast = methods.findLast

    return methods

}
