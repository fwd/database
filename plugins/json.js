const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const cache = require('@fwd/cache')
const dirtyJSON = require('dirty-json')

function uuid() {
    return `xxxxxxxxxxx`.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16)
    })
}

function paginateArray(array, page_size, page_number) {
    return array.slice((page_number - 1) * page_size, page_number * page_size);
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
        try {
            if (fs.existsSync(path)) {
                fs.readdir(path, (err, files) => {
                    resolve(files)
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

var saving = false

async function writing(interval) {
    return new Promise((resolve) => {
        var check = setInterval(() => {
            if (!saving) {
                resolve()
                clearInterval(check)
            }
        }, interval || 10)
    })
}

function read(path, cached) {
    return new Promise(async (resolve, reject) => {
        if (cache(path)) return resolve(cache(path))
        await writing()
        fs.readFile(path, 'utf8', function(error, data) {
            var string = data.toString()
            if (error || !data || !string) {
                console.log("Database Error: Bad Buffer", path)
                resolve()
                return
            }
            try {
                resolve(JSON.parse(string))
            } catch (e) {
                console.log("Database Error: Bad JSON", path)
                resolve(dirtyJSON.parse(string))
            }
        })
    })
}

function write(path, value) {
    return new Promise(async (resolve, reject) => {
        saving = true
        fs.writeFile(path, JSON.stringify(value), function(err) {
            if (err) console.log("Error", error)
            resolve(value)
            cache(path, value)
            saving = false
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
        _list(key) {
            return new Promise(async (resolve) => {
                var key = config.path
                if (!await check(key)) {
                    fs.mkdirSync(key)
                }
                var key = `${config.path}/${config.namespace}`
                if (!await check(key)) {
                    fs.mkdirSync(key)
                }
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
                    return reject({ error: true, message: "Not allowed" })
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
                resolve({
                    page: Number(page),
                    limit: Number(limit),
                    total: files.length,
                    data: paginateArray(files, limit, page),
                    pages: pages
                })
            })
        },
        find(model, query) {
            var self = this
            return new Promise(async (resolve, reject) => {

                var namespace = await self.permission(model)

                if (!namespace) {
                    return reject({ error: true, message: "Not allowed" })
                }

                query = query ? JSON.parse(JSON.stringify(query)) : query

                var key = `${namespace}/${model}`

                if (!await check(key)) {
                    resolve([])
                    return
                }

                if (await check(`${key}`) && fs.lstatSync(key).isFile()) {
                    resolve(await read(`${key}`))
                    return
                }

                if (await check(`${key}/_default`)) {
                    resolve(await read(`${key}/_default`))
                    return
                }

                if (query && query.id && await check(`${key}/${query.id}`) && fs.lstatSync(`${key}/${query.id}`).isFile()) {
                    resolve([await read(`${key}/${query.id}`)])
                    return
                }

                var files = await walk(key)

                for (var i in files) {
                    files[i] = await read(files[i])
                }

                files = files.filter(a => a)
                files = _.sortBy(files, 'created_at').reverse()
                files = files.map(a => {
                    var b = {
                        id: a.id,
                        created_at: a.created_at,
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
                    return reject({ error: true, message: "Not allowed" })
                }

                var key = `${namespace}/${model}`

                if (!await check(key)) {
                    fs.mkdirSync(key, { recursive: true })
                }

                if (await check(`${key}/_default`)) {
                    reject({ error: true, message: `${model} is not an Array.` })
                    return
                }

                if (!await check(key)) {
                    fs.mkdirSync(key)
                }

                var items = Array.isArray(value) ? value : [ value ? value : {} ]

                for (var i in items) {
                    var item = items[i]
                    if (!item.id) item.id = uuid()
                    if (!item.created_at) item.created_at = new Date().getTime()
                    if (!allowed(`${model}`, namespace)) {
                        reject({
                            code: 401,
                            error: true,
                        })
                        return
                    }
                    resolve(await write(`${key}/${item.id}`, item))
                }

            })
        },
        update(model, id, update) {
            var self = this
            return new Promise(async (resolve, reject) => {

                var namespace = await self.permission(model)

                if (!namespace) {
                    return reject({ error: true, message: "Not allowed" })
                }

                var key = `${namespace}/${model}`

                if (id) key += `/${id}`

                if (!await check(key)) {
                    return reject({ error: true, message: "Not found" })
                }

                var item = await read(key, true)

                if (!update) {
                    update = {}
                    update.updated_at = new Date().getTime()
                }

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
                    return reject({ error: true, message: "Not allowed" })
                }

                var key = `${namespace}/${model}`

                if (!await check(key)) {
                    fs.mkdirSync(key, { recursive: true })
                }

                var key = `${config.path}/${config.namespace}/${model}/_default`

                if (Array.isArray(value) && !value.length) {
                    resolve(fs.unlink(key, function() {}))
                } else {
                    resolve(await write(key, value))
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
                    return reject({ error: true, message: "Not allowed." })
                }

                var key = `${namespace}/${model}`

                if (id) key += `/${id}`

                if (!await check(key)) {
                    reject({ error: true, message: "Not found." })
                    return
                }

                cache(key, null) // flush cache

                fs.unlink(key, function() {})

                resolve("Ok")

            })
        },
    }
}