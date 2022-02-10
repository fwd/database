const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const cache = require('@fwd/cache')
const dirtyJSON = require('dirty-json')
const queryJSON = require('json-query')

// '.lock' mechanism for simultaneous file read/write
// https://en.wikipedia.org/wiki/readers-writer_lock
let saving = false

function uuid() {
    return `xxxxxxxxxxx`.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16)
    })
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

function writing(path, interval) {
    return new Promise((resolve) => {
        if (!saving || saving != path) return resolve()
        var check = setInterval(() => {
            if (!saving || saving != path) {
                resolve()
                clearInterval(check)
            }
        }, 5)
    })
}

function read(path, raw) {
    return new Promise(async (resolve, reject) => {
        if (cache(path)) return resolve(cache(path))
        await writing(path)
        fs.readFile(path, 'utf8', function(error, data) {
            if (!data || error) {
                console.log("Database Error: Bad Buffer", path)
                return resolve()
            }
            var string = data.toString()
            try {
                var object = raw ? string : JSON.parse(string)
                cache(path, object)
                resolve(object)
            } catch (e) {
                console.log("Database Error: Bad JSON", path)
                resolve(dirtyJSON.parse(string))
            }
        })
    })
}

function write(path, value, raw) {
    return new Promise(async (resolve, reject) => {
        saving = path
        fs.writeFile(path, raw ? value : JSON.stringify(value), function(err) {
            saving = false
            if (err) {
                console.log("Database Error: Bad Write", path)
                resolve()
                return
            }
            cache(path, value)
            resolve(value)
        })
    })
}

function walk(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    var ignore = ['.DS_Store']
    list.forEach(function(file) {
        if (ignore.includes(file)) return
        file = dir + '/' + file;
        var stat = fs.statSync(file)
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

function allowed(string, allowed) {
    var filename = path.join(allowed, string);
    if (filename.indexOf(allowed) !== 0) {
        return false
    }
    return true
}

module.exports = (config) => {
    config = config || {}
    config.path = config.path || config.base_path || '.data'
    config.namespace = config.namespace || '_default'
    config.default_key = config.default_key || '_default'
    config.created_key = config.created_key || 'created_at'
    config.updated_key = config.updated_key || 'updated_at'
    return {
        async permission(model) {

            var base = config.path

            if (!await check(base)) fs.mkdirSync(base)

            var namespace = `${base}/${config.namespace}`

            if (!allowed(model, namespace)) {
                return false                
            }

            return namespace
            
        },
        _list(path) {
            var self = this
            return new Promise(async (resolve) => {
                
                var namespace = await self.permission(path)

                if (!namespace) {
                    return reject({ error: true, message: "Database Error: Invalid path" })
                }

                var key = `${namespace}/${path}`

                var response = []

                var models = await list(key)

                for (var a in models) {
                    var model = models[a]
                    var keys = await list(`${key}/${model}`)
                    for (var b in keys) {
                        response.push(`${model}/${keys[b]}`)
                    }
                }

                resolve(response)

            })
        },
        list(model) {
            var self = this
            return new Promise(async (resolve, reject) => {

                var namespace = await self.permission(model)

                if (!namespace) {
                    return reject({ error: true, message: "Database Error: Invalid path" })
                }

                var key = `${namespace}/${model}`
   
                if (!await check(key)) {
                    reject({
                        code: 404,
                        error: true,
                    })
                }

                resolve(await list(key))

            })
        },
        get(model, query) {
            return this.find(model, query)
        },
        query(model, query, locals) {
            return new Promise(async (resolve, reject) => {
                var data = { [model]: await this.find(model)}
                query = query ? `${model}${query}` : query
                resolve( queryJSON(query, { data: data, locals: locals }) )
            })
        },
        findFirst(model, query) {
            return this.findOne(model, query)
        },
        findLast(model, query) {
            return new Promise(async (resolve, reject) => {
                var data = await this.find(model, query)
                resolve( Array.isArray(data) ? _.last(data) : data )
            })
        },
        findOne(model, query) {
            return new Promise(async (resolve, reject) => {
                var data = await this.find(model, query)
                resolve( Array.isArray(data) ? _.first(data) : data )
            })
        },
        _paginate(array, limit, page) {
            return array.slice((page - 1) * limit, page * limit)
        },
        paginate(model, query) {
            var self = this
            return new Promise(async (resolve, reject) => {
                
                var files = await self.find(model, query)
                
                query = query || {}
                
                var page = query.page || 1
                
                var limit = query.limit || files.length
                
                var pages = Math.floor(files.length / limit)

                if (files.length > limit && pages == 1) {
                    pages += 1
                }

                if (pages == 0) {
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

            })
        },
        find(model, query) {
            var self = this
            return new Promise(async (resolve, reject) => {

                var namespace = await self.permission(model)

                if (!namespace) {
                    return reject({ error: true, message: "Database Error: Invalid path" })
                }

                query = query ? JSON.parse(JSON.stringify(query)) : query

                var key = `${namespace}/${model}`

                if (!await check(key)) {
                    resolve([])
                    return
                }

                if ( fs.lstatSync(key).isFile()) {
                    var contents = await read(`${key}`, true) // read contents without JSON.parse
                    try {
                        if (JSON.parse(contents)) resolve(JSON.parse(contents)) 
                    } catch(e) { resolve(contents) }
                    return
                }

                if (await check(`${key}/${config.default_key}`)) {
                    var contents = await read(`${key}/${config.default_key}`, true) // read contents without JSON.parse
                    try {
                        if (JSON.parse(contents)) resolve(JSON.parse(contents)) 
                    } catch(e) { resolve(contents) }
                    return
                }
                
                query = (typeof query == 'string' ? { id: query } : query)

                if (query && query.id && await check(`${key}/${query.id}`) && fs.lstatSync(`${key}/${query.id}`).isFile()) {
                    resolve([await read(`${key}/${query.id}`)])
                    return
                }

                var _list = await list(key)

                var files = []

                for (var i in _list) {
                    files.push(await read(`${key}/${_list[i]}`))
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
                        delete query.limit
                        delete query.page
                        for (var key in query) {
                            if (item[key] === undefined || item[key] != query[key]) return false;
                        }
                        return true;
                    })
                }

                resolve(files)

            })
        },
        create(model, value) {
            var self = this
            return new Promise(async (resolve, reject) => {

                var namespace = await self.permission(model)

                if (!namespace) {
                    return reject({ error: true, message: "Database Error: Invalid path" })
                }

                var key = `${namespace}/${model}`

                if (!await check(key)) {
                    fs.mkdirSync(key, { recursive: true })
                }

                if (await check(`${key}/${config.default_key}`)) {
                    reject({ error: true, message: `${model} is not an Array.` })
                    return
                }

                var items = Array.isArray(value) ? value : [ value ? value : {} ]

                for (var i in items) {
                    var item = items[i]
                    if (!item.id) item.id = uuid()
                    if (!item[config.created_key]) item[config.created_key] = new Date().getTime()
                    await write(`${key}/${item.id}`, item)
                }

                resolve( items.length > 1 ? { total: items.length, sample: _.sampleSize(items, 10) } : _.first(items) )

            })
        },
        pluck(model, id, key) {
            var self = this
            return new Promise(async (resolve, reject) => {

                var namespace = await self.permission(model)

                if (!namespace) {
                    return reject({ error: true, message: "Database Error: Invalid path" })
                }

                var key = `${namespace}/${model}`

                if (id) key += `/${id}`

                if (!await check(key)) {
                    return reject({ error: true, message: "Not found" })
                }

                cache(key, null) // flush cache

                var item = await read(key)

                delete item[key]

                resolve(await write(key, item))

            })
        },
        update(model, id, update) {
            var self = this
            return new Promise(async (resolve, reject) => {

                var namespace = await self.permission(model)

                if (!namespace) {
                    return reject({ error: true, message: "Database Error: Invalid path" })
                }

                var key = `${namespace}/${model}`

                if (id) key += `/${id}`

                if (!await check(key)) {
                    return reject({ error: true, message: "Not found" })
                }

                cache(key, null) // flush cache

                var item = await read(key)

                if (!update) update = {}
                
                update[config.updated_key] = new Date().getTime()

                Object.keys(update).map(key => {
                    item[key] = update[key]
                })

                resolve(await write(key, item))

            })
        },
        set(model, value) {
            var self = this
            return new Promise(async (resolve, reject) => {

                var namespace = await self.permission(model)

                if (!namespace) {
                    return reject({ error: true, message: "Database Error: Invalid path" })
                }

                var key = `${namespace}/${model}`

                if (!await check(key)) {
                    fs.mkdirSync(key, { recursive: true })
                }

                key += `/${config.default_key}`

                if (Array.isArray(value) && !value.length) {
                    
                    resolve( fs.unlink(key, function() {}) ) // remove `${config.default_key}` file

                } else {

                    try {
                        if (JSON.stringify(value)) resolve( await write(key, value) ) 
                        
                    } catch(e) {
                        resolve( await write(key, value, true) ) // write without JSON stringifying
                    }

                }

            })
        },
        delete(model, id) {
            return this.remove(model, id)
        },
        remove(model, id) {
            var self = this
            return new Promise(async (resolve, reject) => {

                var namespace = await self.permission(model)

                if (!namespace) {
                    return reject({ error: true, message: "Database Error: Invalid path." })
                }

                var key = `${namespace}/${model}`

                if (id) key += `/${id}`

                if (!await check(key)) {
                    reject({ error: true, message: "Not found." })
                    return
                }

                cache(key, null) // flush cache

                fs.unlink(key, function() {})

                resolve()

            })
        },
    }
}
