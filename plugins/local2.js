const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const server = require('@fwd/server')
const rimraf = require("rimraf")

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
		  resolve({
		  	error: true
		  })
		}
	}) 
}

function read(path) {
	if (server.cache(path)) {
		return server.cache(path)
	}
	return JSON.parse(fs.readFileSync(path).toString()) 
}

function write(path, value) {
	return new Promise(async (resolve, reject) => {
		try {
			fs.writeFile(path, JSON.stringify(value), function(err) {
			    if (err) {
			        console.log(err);
			    	resolve(false)
			        return 
			    }
				server.cache(path, value)
			    resolve(value)
			})
		} catch(err) {
		  console.error(err)
		  resolve(false)
		}
	}) 
}

function walk(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
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
					reject({
						code: 404,
						message: "Namespace does not exists.",
					})
					return 
				}

				if (await check(`${key}`) && fs.lstatSync(key).isFile() ) {
					resolve(read(`${key}`))
					return
				}

				if (await check(`${key}/_default`)) {
					resolve( read(`${key}/_default`) )
					return
				}

				var files = await walk(key)

				if (!files.length) {
					return {
						error: true,
						message: "Namespace is empty."
					}
				}

				files = files.map(a => {
					var data = read(a)
					server.cache(a, data)
					return data
				})

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

					if (!item.id) item.id = server.uuid(true)
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

				var item = read(key)

				Object.keys(update).map(key => {
					item[key] = update[key]
				})

				resolve( await write(key, item) )

			})

		},
		set(key, value) {

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