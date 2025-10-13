const cache = require('./cache')

const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const dirtyJSON = require('dirty-json')
const queryJSON = require('json-query')
const crypto = require('crypto')

// Enhanced locking mechanism for simultaneous file read/write with timeout
// https://en.wikipedia.org/wiki/readers-writer_lock
const locks = new Map()
const LOCK_TIMEOUT = 30000 // 30 seconds timeout for locks

// Security and robustness constants
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB max file size
const MAX_PATH_LENGTH = 4096 // Maximum path length
const ALLOWED_CHARS_REGEX = /^[a-zA-Z0-9._-]+$/
const FORBIDDEN_PATHS = ['..', '~', '/', '\\', ':', '*', '?', '"', '<', '>', '|']
const MAX_RETRIES = 3
const RETRY_DELAY = 100 // ms

// Enhanced UUID generation with better entropy for radiation environments
function uuid() {
    // Use crypto.randomBytes for better entropy in radiation environments
    const bytes = crypto.randomBytes(16)
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // Variant bits
    return bytes.toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
}

// Security validation functions
function validateInput(input, type = 'string') {
    if (input === null || input === undefined) {
        throw new Error('Input cannot be null or undefined')
    }
    
    if (type === 'string' && typeof input !== 'string') {
        throw new Error('Input must be a string')
    }
    
    if (type === 'object' && typeof input !== 'object') {
        throw new Error('Input must be an object')
    }
    
    if (typeof input === 'string') {
        if (input.length > MAX_PATH_LENGTH) {
            throw new Error(`Input too long: maximum ${MAX_PATH_LENGTH} characters allowed`)
        }
        
        // Check for forbidden path characters
        for (const forbidden of FORBIDDEN_PATHS) {
            if (input.includes(forbidden)) {
                throw new Error(`Forbidden character '${forbidden}' in input`)
            }
        }
        
        // Additional security checks
        if (input.includes('\0') || input.includes('\r') || input.includes('\n')) {
            throw new Error('Input contains forbidden control characters')
        }
    }
    
    return true
}

function sanitizePath(input) {
    validateInput(input, 'string')
    
    // Remove any potential path traversal attempts
    let sanitized = input.replace(/\.\./g, '').replace(/\/+/g, '/')
    
    // Ensure it matches allowed character pattern
    if (!ALLOWED_CHARS_REGEX.test(sanitized)) {
        throw new Error('Path contains invalid characters')
    }
    
    return sanitized
}

function calculateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex')
}

function verifyChecksum(data, expectedChecksum) {
    const actualChecksum = calculateChecksum(data)
    return actualChecksum === expectedChecksum
}

function check(path) {
    return new Promise(async (resolve, reject) => {
        try {
            if (fs.existsSync(path)) {
                resolve(true)
            } else {
                resolve(false)
            }
        } catch (err) {
            console.error(err)
            resolve(false)
        }
    })
}

function list(path) {
    return new Promise(async (resolve, reject) => {
        var exclude = [ '.DS_Store' ]
        try {
            if (fs.existsSync(path)) {
                fs.readdir(path, (err, files) => {
                    resolve(files.filter(a => a && !exclude.includes(a)))
                })
            } else {
                resolve({
                    error: true
                })
            }
        } catch (err) {
            console.error(err)
            resolve()
        }
    })
}

// Enhanced locking mechanism with timeout and cleanup
function acquireLock(filePath) {
    return new Promise((resolve, reject) => {
        const lockKey = path.resolve(filePath)
        const lockId = crypto.randomUUID()
        
        // Check if lock already exists
        if (locks.has(lockKey)) {
            const existingLock = locks.get(lockKey)
            const now = Date.now()
            
            // Check if existing lock has timed out
            if (now - existingLock.timestamp > LOCK_TIMEOUT) {
                locks.delete(lockKey)
            } else {
                return reject(new Error(`File is locked: ${filePath}`))
            }
        }
        
        // Acquire new lock
        locks.set(lockKey, {
            id: lockId,
            timestamp: Date.now(),
            path: lockKey
        })
        
        resolve(lockId)
    })
}

function releaseLock(filePath, lockId) {
    const lockKey = path.resolve(filePath)
    const lock = locks.get(lockKey)
    
    if (lock && lock.id === lockId) {
        locks.delete(lockKey)
        return true
    }
    
    return false
}

function waitForLock(filePath) {
    return new Promise((resolve, reject) => {
        const lockKey = path.resolve(filePath)
        const startTime = Date.now()
        
        const checkLock = () => {
            if (!locks.has(lockKey)) {
                resolve()
                return
            }
            
            const lock = locks.get(lockKey)
            const now = Date.now()
            
            // Check for timeout
            if (now - startTime > LOCK_TIMEOUT) {
                reject(new Error(`Lock timeout for file: ${filePath}`))
                return
            }
            
            // Check if existing lock has timed out
            if (now - lock.timestamp > LOCK_TIMEOUT) {
                locks.delete(lockKey)
                resolve()
                return
            }
            
            // Wait and check again
            setTimeout(checkLock, 10)
        }
        
        checkLock()
    })
}

// Cleanup expired locks periodically
setInterval(() => {
    const now = Date.now()
    for (const [lockKey, lock] of locks.entries()) {
        if (now - lock.timestamp > LOCK_TIMEOUT) {
            locks.delete(lockKey)
        }
    }
}, 5000) // Cleanup every 5 seconds

function read(path, raw) {
    return new Promise(async (resolve, reject) => {
        try {
            validateInput(path, 'string')
            const sanitizedPath = sanitizePath(path)
            
            if (cache(sanitizedPath)) return resolve(cache(sanitizedPath))
            
            await waitForLock(sanitizedPath)
            
            // Retry mechanism for radiation-induced errors
            let attempts = 0
            while (attempts < MAX_RETRIES) {
                try {
                    const stats = fs.statSync(sanitizedPath)
                    
                    // Check file size limit
                    if (stats.size > MAX_FILE_SIZE) {
                        throw new Error(`File too large: ${stats.size} bytes (max: ${MAX_FILE_SIZE})`)
                    }
                    
                    const data = fs.readFileSync(sanitizedPath, 'utf8')
                    
                    if (!data) {
                        throw new Error('Empty file content')
                    }
                    
                    // Verify file integrity if checksum file exists
                    const checksumPath = sanitizedPath + '.checksum'
                    if (fs.existsSync(checksumPath)) {
                        const expectedChecksum = fs.readFileSync(checksumPath, 'utf8').trim()
                        if (!verifyChecksum(data, expectedChecksum)) {
                            throw new Error('File integrity check failed - possible corruption')
                        }
                    }
                    
                    let result
                    if (raw) {
                        result = data
                    } else {
                        try {
                            result = JSON.parse(data)
                        } catch (parseError) {
                            // Try to recover with dirty JSON parser
                            result = dirtyJSON.parse(data)
                        }
                    }
                    
                    cache(sanitizedPath, result)
                    resolve(result)
                    return
                    
                } catch (error) {
                    attempts++
                    if (attempts >= MAX_RETRIES) {
                        reject(new Error(`Failed to read file after ${MAX_RETRIES} attempts: ${error.message}`))
                        return
                    }
                    
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempts))
                }
            }
            
        } catch (error) {
            reject(error)
        }
    })
}

function write(path, value, raw) {
    return new Promise(async (resolve, reject) => {
        try {
            validateInput(path, 'string')
            const sanitizedPath = sanitizePath(path)
            
            // Validate value size
            const serializedValue = raw ? value : JSON.stringify(value)
            if (serializedValue.length > MAX_FILE_SIZE) {
                throw new Error(`Value too large: ${serializedValue.length} bytes (max: ${MAX_FILE_SIZE})`)
            }
            
            const lockId = await acquireLock(sanitizedPath)
            
            try {
                // Atomic write with backup and rollback
                const tempPath = sanitizedPath + '.tmp'
                const backupPath = sanitizedPath + '.backup'
                const checksumPath = sanitizedPath + '.checksum'
                
                // Create backup if file exists
                if (fs.existsSync(sanitizedPath)) {
                    fs.copyFileSync(sanitizedPath, backupPath)
                }
                
                // Calculate checksum
                const checksum = calculateChecksum(serializedValue)
                
                // Retry mechanism for radiation-induced errors
                let attempts = 0
                while (attempts < MAX_RETRIES) {
                    try {
                        // Write to temporary file first
                        fs.writeFileSync(tempPath, serializedValue, 'utf8')
                        
                        // Verify the write
                        const writtenData = fs.readFileSync(tempPath, 'utf8')
                        if (writtenData !== serializedValue) {
                            throw new Error('Write verification failed')
                        }
                        
                        // Write checksum file
                        fs.writeFileSync(checksumPath, checksum, 'utf8')
                        
                        // Atomic move from temp to final location
                        fs.renameSync(tempPath, sanitizedPath)
                        
                        // Verify final file integrity
                        const finalData = fs.readFileSync(sanitizedPath, 'utf8')
                        if (finalData !== serializedValue) {
                            throw new Error('Final file verification failed')
                        }
                        
                        // Update cache
                        cache(sanitizedPath, raw ? value : JSON.parse(serializedValue))
                        
                        // Clean up backup
                        if (fs.existsSync(backupPath)) {
                            fs.unlinkSync(backupPath)
                        }
                        
                        resolve(raw ? value : JSON.parse(serializedValue))
                        return
                        
                    } catch (error) {
                        attempts++
                        
                        // Clean up temp file
                        if (fs.existsSync(tempPath)) {
                            fs.unlinkSync(tempPath)
                        }
                        
                        if (attempts >= MAX_RETRIES) {
                            // Restore from backup if available
                            if (fs.existsSync(backupPath)) {
                                fs.copyFileSync(backupPath, sanitizedPath)
                                fs.unlinkSync(backupPath)
                            }
                            
                            throw new Error(`Failed to write file after ${MAX_RETRIES} attempts: ${error.message}`)
                        }
                        
                        // Wait before retry
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempts))
                    }
                }
                
            } finally {
                releaseLock(sanitizedPath, lockId)
            }
            
        } catch (error) {
            reject(error)
        }
    })
}

function walk(dir) {
    try {
        validateInput(dir, 'string')
        const sanitizedDir = sanitizePath(dir)
        
        var results = [];
        var list = fs.readdirSync(sanitizedDir);
        var ignore = ['.DS_Store', '.tmp', '.backup', '.checksum']
        
        list.forEach(function(file) {
            if (ignore.includes(file)) return
            
            // Additional security check
            if (!ALLOWED_CHARS_REGEX.test(file)) {
                return // Skip files with invalid characters
            }
            
            file = path.join(sanitizedDir, file);
            
            try {
                var stat = fs.statSync(file)
                if (stat && stat.isDirectory()) {
                    results = results.concat(walk(file));
                } else {
                    results.push(file);
                }
            } catch (statError) {
                // Skip files that can't be accessed
                console.warn(`Skipping inaccessible file: ${file}`)
            }
        });
        return results;
    } catch (error) {
        console.error(`Error walking directory ${dir}:`, error.message)
        return []
    }
}

function allowed(string, allowed) {
    try {
        validateInput(string, 'string')
        validateInput(allowed, 'string')
        
        var filename = path.resolve(path.join(allowed, string));
        var allowedPath = path.resolve(allowed);
        
        // Additional security checks
        if (filename.indexOf(allowedPath) !== 0) {
            return false
        }
        
        // Check for path traversal attempts
        if (filename.includes('..') || filename.includes('~')) {
            return false
        }
        
        // Ensure the resolved path is within allowed directory
        const relativePath = path.relative(allowedPath, filename)
        if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            return false
        }
        
        return true
    } catch (error) {
        return false
    }
}

module.exports = (config) => {
    config = config || {}
    config.path = config.path || config.base_path || '.data'
    config.namespace = config.namespace || '_default'
    config.default_key = config.default_key || '_default'
    config.created_key = config.created_key || 'created_at'
    config.updated_key = config.updated_key || 'updated_at'
    
    // Validate configuration
    try {
        validateInput(config.path, 'string')
        validateInput(config.namespace, 'string')
        validateInput(config.default_key, 'string')
        validateInput(config.created_key, 'string')
        validateInput(config.updated_key, 'string')
    } catch (error) {
        throw new Error(`Invalid configuration: ${error.message}`)
    }
    
    return {
        async permission(model) {
            try {
                validateInput(model, 'string')
                const sanitizedModel = sanitizePath(model)
                
                var base = config.path

                try {
                    if (!await check(base)) {
                        fs.mkdirSync(base, { recursive: true })
                    }
                } catch (error) {
                    throw new Error(`Failed to create base directory: ${error.message}`)
                }

                var namespace = `${base}/${config.namespace}`

                if (!allowed(sanitizedModel, namespace)) {
                    throw new Error(`Invalid path: ${sanitizedModel}`)
                }

                return namespace
                
            } catch (error) {
                throw new Error(`Permission check failed: ${error.message}`)
            }
        },
        _list(path) {
            var self = this
            return new Promise(async (resolve, reject) => {
                try {
                    validateInput(path, 'string')
                    const sanitizedPath = sanitizePath(path)
                    
                    var namespace = await self.permission(sanitizedPath)
                    var key = `${namespace}/${sanitizedPath}`

                    var response = []
                    var models = await list(key)

                    if (models && models.error) {
                        reject({ error: true, message: "Failed to list directory" })
                        return
                    }

                    for (var a in models) {
                        var model = models[a]
                        var keys = await list(`${key}/${model}`)
                        
                        if (keys && !keys.error) {
                            for (var b in keys) {
                                response.push(`${model}/${keys[b]}`)
                            }
                        }
                    }

                    resolve(response)

                } catch (error) {
                    reject({ error: true, message: `List operation failed: ${error.message}` })
                }
            })
        },
        list(model) {
            var self = this
            return new Promise(async (resolve, reject) => {
                try {
                    validateInput(model, 'string')
                    const sanitizedModel = sanitizePath(model)
                    
                    var namespace = await self.permission(sanitizedModel)
                    var key = `${namespace}/${sanitizedModel}`
   
                    if (!await check(key)) {
                        reject({
                            code: 404,
                            error: true,
                            message: "Directory not found"
                        })
                        return
                    }

                    const result = await list(key)
                    if (result && result.error) {
                        reject({ error: true, message: "Failed to list directory contents" })
                        return
                    }

                    resolve(result || [])

                } catch (error) {
                    reject({ error: true, message: `List operation failed: ${error.message}` })
                }
            })
        },
        get(model, query) {
            return this.find(model, query)
        },
        query(model, query, locals) {
            return new Promise(async (resolve, reject) => {
                try {
                    validateInput(model, 'string')
                    const sanitizedModel = sanitizePath(model)
                    
                    var data = { [sanitizedModel]: await this.find(sanitizedModel)}
                    query = query ? `${sanitizedModel}${query}` : query
                    
                    const result = queryJSON(query, { data: data, locals: locals })
                    resolve(result)
                    
                } catch (error) {
                    reject({ error: true, message: `Query operation failed: ${error.message}` })
                }
            })
        },
        findFirst(model, query) {
            return this.findOne(model, query)
        },
        findLast(model, query) {
            return new Promise(async (resolve, reject) => {
                try {
                    validateInput(model, 'string')
                    const sanitizedModel = sanitizePath(model)
                    
                    var data = await this.find(sanitizedModel, query)
                    resolve( Array.isArray(data) ? _.last(data) : data )
                    
                } catch (error) {
                    reject({ error: true, message: `FindLast operation failed: ${error.message}` })
                }
            })
        },
        findOne(model, query) {
            return new Promise(async (resolve, reject) => {
                try {
                    validateInput(model, 'string')
                    const sanitizedModel = sanitizePath(model)
                    
                    var data = await this.find(sanitizedModel, query)
                    resolve( Array.isArray(data) ? _.first(data) : data )
                    
                } catch (error) {
                    reject({ error: true, message: `FindOne operation failed: ${error.message}` })
                }
            })
        },
        _paginate(array, limit, page) {
            return array.slice((page - 1) * limit, page * limit)
        },
        paginate(model, query) {
            var self = this
            return new Promise(async (resolve, reject) => {
                try {
                    validateInput(model, 'string')
                    const sanitizedModel = sanitizePath(model)
                    
                    var files = await self.find(sanitizedModel, query)
                    
                    query = query || {}
                    
                    var page = Math.max(1, parseInt(query.page) || 1)
                    var limit = Math.max(1, parseInt(query.limit) || files.length)
                    
                    // Ensure limit is reasonable for satellite environments
                    limit = Math.min(limit, 1000) // Max 1000 items per page
                    
                    var pages = Math.ceil(files.length / limit)

                    var response = {
                        page: Number(page),
                        limit: Number(limit),
                        total: files.length,
                        data: self._paginate(files, limit, page),
                        pages: pages
                    }

                    resolve(response)

                } catch (error) {
                    reject({ error: true, message: `Paginate operation failed: ${error.message}` })
                }
            })
        },
        find(model, query) {
            var self = this
            return new Promise(async (resolve, reject) => {
                try {
                    validateInput(model, 'string')
                    const sanitizedModel = sanitizePath(model)
                    
                    var namespace = await self.permission(sanitizedModel)
                    var key = `${namespace}/${sanitizedModel}`

                    if (!await check(key)) {
                        resolve([])
                        return
                    }

                    // Handle single file case
                    if (fs.lstatSync(key).isFile()) {
                        var contents = await read(`${key}`, true)
                        try {
                            if (JSON.parse(contents)) resolve(JSON.parse(contents)) 
                        } catch(e) { 
                            resolve(contents) 
                        }
                        return
                    }

                    // Handle default key case
                    if (await check(`${key}/${config.default_key}`)) {
                        var contents = await read(`${key}/${config.default_key}`, true)
                        try {
                            if (JSON.parse(contents)) resolve(JSON.parse(contents)) 
                        } catch(e) { 
                            resolve(contents) 
                        }
                        return
                    }
                    
                    // Handle query by ID
                    query = (typeof query == 'string' ? { id: query } : query)

                    if (query && query.id && await check(`${key}/${query.id}`) && fs.lstatSync(`${key}/${query.id}`).isFile()) {
                        resolve([await read(`${key}/${query.id}`)])
                        return
                    }

                    var _list = await list(key)
                    if (_list && _list.error) {
                        resolve([])
                        return
                    }

                    var files = []

                    for (var i in _list) {
                        try {
                            const fileData = await read(`${key}/${_list[i]}`)
                            if (fileData) {
                                files.push(fileData)
                            }
                        } catch (readError) {
                            // Skip corrupted files but continue processing
                            console.warn(`Skipping corrupted file: ${_list[i]}`)
                        }
                    }
                    
                    files = files.filter(a => a)
                    
                    files = _.sortBy(files, config.created_key)

                    files = files.map(a => {
                        var b = {
                            id: a.id,
                            [config.created_key]: a[config.created_key],
                        }
                        Object.keys(a).map(c => b[c] = a[c])
                        return b
                    })

                    if (query) {
                        files = files.filter(function(item) {
                            const queryCopy = { ...query }
                            delete queryCopy.limit
                            delete queryCopy.page
                            
                            for (var key in queryCopy) {
                                if (item[key] === undefined || item[key] != queryCopy[key]) return false;
                            }
                            return true;
                        })
                    }

                    resolve(files)

                } catch (error) {
                    reject({ error: true, message: `Find operation failed: ${error.message}` })
                }
            })
        },
        create(model, value) {
            var self = this
            return new Promise(async (resolve, reject) => {
                try {
                    validateInput(model, 'string')
                    const sanitizedModel = sanitizePath(model)
                    
                    if (value !== null && value !== undefined) {
                        validateInput(value, 'object')
                    }
                    
                    var namespace = await self.permission(sanitizedModel)
                    var key = `${namespace}/${sanitizedModel}`

                    if (!await check(key)) {
                        fs.mkdirSync(key, { recursive: true })
                    }

                    if (await check(`${key}/${config.default_key}`)) {
                        reject({ error: true, message: `${sanitizedModel} is not an Array.` })
                        return
                    }

                    var items = Array.isArray(value) ? value : [ value ? value : {} ]

                    // Validate and sanitize items
                    for (var i in items) {
                        var item = items[i]
                        
                        // Ensure required fields
                        if (!item.id) item.id = uuid()
                        if (!item[config.created_key]) item[config.created_key] = new Date().getTime()
                        
                        // Validate item size
                        const serializedItem = JSON.stringify(item)
                        if (serializedItem.length > MAX_FILE_SIZE) {
                            reject({ error: true, message: `Item too large: ${serializedItem.length} bytes` })
                            return
                        }
                        
                        await write(`${key}/${item.id}`, item)
                    }

                    resolve( items.length > 1 ? { total: items.length, sample: _.sampleSize(items, 10) } : _.first(items) )

                } catch (error) {
                    reject({ error: true, message: `Create operation failed: ${error.message}` })
                }
            })
        },
        pluck(model, id, fieldKey) {
            var self = this
            return new Promise(async (resolve, reject) => {
                try {
                    validateInput(model, 'string')
                    validateInput(fieldKey, 'string')
                    const sanitizedModel = sanitizePath(model)
                    
                    var namespace = await self.permission(sanitizedModel)
                    var key = `${namespace}/${sanitizedModel}`

                    if (id) {
                        validateInput(id, 'string')
                        key += `/${sanitizePath(id)}`
                    }

                    if (!await check(key)) {
                        return reject({ error: true, message: "Not found" })
                    }

                    cache(key, null) // flush cache

                    var item = await read(key)
                    if (!item) {
                        return reject({ error: true, message: "Failed to read item" })
                    }

                    delete item[fieldKey]

                    resolve(await write(key, item))

                } catch (error) {
                    reject({ error: true, message: `Pluck operation failed: ${error.message}` })
                }
            })
        },
        update(model, id, update) {
            var self = this
            return new Promise(async (resolve, reject) => {
                try {
                    validateInput(model, 'string')
                    validateInput(id, 'string')
                    const sanitizedModel = sanitizePath(model)
                    const sanitizedId = sanitizePath(id)
                    
                    var namespace = await self.permission(sanitizedModel)
                    var key = `${namespace}/${sanitizedModel}/${sanitizedId}`

                    if (!await check(key)) {
                        return reject({ error: true, message: "Not found" })
                    }

                    cache(key, null) // flush cache

                    var item = await read(key)
                    if (!item) {
                        return reject({ error: true, message: "Failed to read item" })
                    }

                    if (!update) update = {}
                    
                    update[config.updated_key] = new Date().getTime()

                    Object.keys(update).map(key => {
                        item[key] = update[key]
                    })

                    resolve(await write(key, item))

                } catch (error) {
                    reject({ error: true, message: `Update operation failed: ${error.message}` })
                }
            })
        },
        set(model, value) {
            var self = this
            return new Promise(async (resolve, reject) => {
                try {
                    validateInput(model, 'string')
                    const sanitizedModel = sanitizePath(model)
                    
                    var namespace = await self.permission(sanitizedModel)
                    var key = `${namespace}/${sanitizedModel}`

                    if (!await check(key)) {
                        fs.mkdirSync(key, { recursive: true })
                    }

                    key += `/${config.default_key}`

                    if (Array.isArray(value) && !value.length) {
                        // Remove file if it exists
                        if (fs.existsSync(key)) {
                            fs.unlinkSync(key)
                        }
                        // Remove checksum file if it exists
                        const checksumPath = key + '.checksum'
                        if (fs.existsSync(checksumPath)) {
                            fs.unlinkSync(checksumPath)
                        }
                        resolve()
                    } else {
                        try {
                            if (JSON.stringify(value)) {
                                resolve(await write(key, value))
                            }
                        } catch(e) {
                            // For circular references or other non-serializable data, convert to string
                            resolve(await write(key, String(value), true))
                        }
                    }

                } catch (error) {
                    reject({ error: true, message: `Set operation failed: ${error.message}` })
                }
            })
        },
        delete(model, id) {
            return this.remove(model, id)
        },
        remove(model, id) {
            var self = this
            return new Promise(async (resolve, reject) => {
                try {
                    validateInput(model, 'string')
                    const sanitizedModel = sanitizePath(model)
                    
                    var namespace = await self.permission(sanitizedModel)
                    var key = `${namespace}/${sanitizedModel}`

                    if (id) {
                        validateInput(id, 'string')
                        key += `/${sanitizePath(id)}`
                    }

                    if (!await check(key)) {
                        reject({ error: true, message: "Not found." })
                        return
                    }

                    cache(key, null) // flush cache

                    // Remove main file
                    if (fs.existsSync(key)) {
                        fs.unlinkSync(key)
                    }
                    
                    // Remove checksum file if it exists
                    const checksumPath = key + '.checksum'
                    if (fs.existsSync(checksumPath)) {
                        fs.unlinkSync(checksumPath)
                    }
                    
                    // Remove backup file if it exists
                    const backupPath = key + '.backup'
                    if (fs.existsSync(backupPath)) {
                        fs.unlinkSync(backupPath)
                    }

                    resolve()

                } catch (error) {
                    reject({ error: true, message: `Remove operation failed: ${error.message}` })
                }
            })
        },
    }
}
