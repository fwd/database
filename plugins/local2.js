const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const cache = require('@fwd/cache')
const dirtyJSON = require('dirty-json')

function uuid() {
	return `xxxxxxxxxxx`.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16)
	})
}

function paginate(array, page_size, page_number) {
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
		} catch(err) {
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
		} catch(err) {
		  console.error(err)
		  resolve()
		}
	}) 
}

function read(path) {
	return new Promise(async (resolve, reject) => {
		if (cache(path)) {
			console.log( cache(path).usage.requests )
			resolve(cache(path))
			return
		}
		fs.readFile(path, 'utf8', function (error, data) {
			var string = data.toString()
		    if (error || !string) {
		    	console.log( "Error", path )
		    	resolve()
		    	return
		    }
		    try {	
		    	resolve( JSON.parse( string ) )
		    } catch(e) {
		    	resolve( dirtyJSON.parse(string) )
		    }
		})
	})
}

function write(path, value) {
	return new Promise(async (resolve, reject) => {
		fs.writeFile(path, JSON.stringify(value), function(err) {
		    if (err) console.log("Error", error)
		    resolve(value)
			cache(path, value)
		})
	}) 
}

function walk(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    var ignore = [ '.DS_Store' ]
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

		_list(key, query) {

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

			return new Promise(async (resolve, reject) => {

				var namespace = `${config.path}/${config.namespace}`

				var key = `${namespace}/${model}`

				if (!allowed(model, namespace)) {
					reject({
						code: 401,
						error: true,
					})
				}

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
				resolve( _.last( await this.find(model, query) ) )
			})
		},
		findOne(model, query) {
			return new Promise(async (resolve, reject) => {
				resolve( _.first( await this.find(model, query) ) )
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
					data: paginate(files, limit, page),
					pages: pages
				})

			})

		},
		find(model, query) {

			return new Promise(async (resolve, reject) => {

				query = query ? JSON.parse(JSON.stringify(query)) : query

				var namespace = `${config.path}/${config.namespace}`

				var key = `${namespace}/${model}`

				if (!allowed(`${model}`, namespace)) {
					reject({
						code: 401,
						error: true,
					})
					return 
				}

				if (!await check(key)) {
					resolve([])
					return 
				}

				if (await check(`${key}`) && fs.lstatSync(key).isFile() ) {
					resolve( await read(`${key}`))
					return
				}

				if (await check(`${key}/_default`)) {
					resolve( await read(`${key}/_default`) )
					return
				}

				if (query && query.id && await check(`${key}/${query.id}`) && fs.lstatSync(`${key}/${query.id}`).isFile() ) {
					resolve([ await read(`${key}/${query.id}`)])
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

			return new Promise(async (resolve, reject) => {

				var base = config.path

				if (!await check(base)) {
					fs.mkdirSync(base)
				}

				var namespace = `${config.path}/${config.namespace}`

				if (!await check(namespace)) {
					fs.mkdirSync(namespace)
				}

				var key = `${namespace}/${model}`

				if (!await check(key)) {
					fs.mkdirSync(key, { recursive: true })
				}

				if (!allowed(`${model}`, namespace)) {
					reject({
						code: 401,
						error: true,
					})
					return
				}

				if (await check(`${key}/_default`)) {
					reject({
						code: 400,
						error: true,
						message: `${model} is not an array.`
					})
					return
				}

				if (!await check(key)) {
					fs.mkdirSync(key)
				}

				var items = Array.isArray(value) ? value : [value]

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
			return new Promise(async (resolve, reject) => {

				var namespace = `${config.path}/${config.namespace}`

				var key = `${namespace}/${model}`

				if (id) key += `/${id}`
				
				if (!allowed(`${model}/${id}`, namespace)) {
					reject({
						code: 401,
						error: true,
					})
					return
				}

				if (!await check(key)) {
					reject({
						error: true,
						message: "Not found"
					})
					return
				}

				if (! fs.lstatSync(key).isFile() ) {
					reject({
						error: true,
						message: "Item is not object"
					})
					return
				}

				var item = await read(key)

				Object.keys(update).map(key => {
					item[key] = update[key]
				})

				resolve( await write(key, item) )

			})
		},
		set(model, value) {

			return new Promise(async (resolve, reject) => {

				var key = config.path

				if (!await check(key)) {
					fs.mkdirSync(key)
				}

				var namespace = `${config.path}/${config.namespace}`

				if (!await check(namespace)) {
					fs.mkdirSync(namespace)
				}

				var key = `${config.path}/${config.namespace}/${model}`
				
				if (!allowed(`${config.namespace}/${model}`, namespace)) {
					reject({
						code: 401,
						error: true,
					})
				}

				if (!await check(key)) {
					fs.mkdirSync(key)
				}

				var key = `${config.path}/${config.namespace}/${model}/_default`
				
				if (!allowed(`${model}`, namespace)) {
					reject({
						code: 401,
						error: true,
					})
					return 
				}

				if (Array.isArray(value) && !value.length) {
					resolve( fs.unlink(key, function() {}) )
				} else {
					resolve( await write(key, value) )
				}

			})

		},
		remove(model, id) {

			return new Promise(async (resolve, reject) => {
			
				var namespace = `${config.path}/${config.namespace}`

				var key = `${namespace}/${model}`

				if (id) key += `/${id}`

				if (!allowed(`${model}/${id}`, namespace)) {
					reject({
						code: 401,
						error: true,
					})
					return
				}

				if (!await check(key)) {
					reject({
						code: 404,
						error: true,
					})
					return
				}

				fs.unlink(key, function() {})

				resolve( "Ok" )

			})

		},

	}

}
