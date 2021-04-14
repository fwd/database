const _ = require('lodash')
const server = require('@fwd/server')
const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')

module.exports = (config) => {

	config = config || {}
	
	const base_path = config.filepath || config.base_path || config.basepath
	
	const database_name = config.database || config.filename || config.namespace

	const path = base_path ? base_path : './'
	
	const database = database_name ? database_name.replace('.json', '') + '.json' : 'database.json'

	return {
		get(key, query) {
			return this.find(key, query)
		},
		findFirst(key, query) {
			return this.findOne(key, query)
		},
		findLast(key, query) {
			return new Promise(async (resolve, reject) => {
				resolve( _.last( await this.find(key, query) ) )
			})
		},
		findOne(key, query) {
			return new Promise(async (resolve, reject) => {
				resolve( _.first( await this.find(key, query) ) )
			})
		},
		find(key, query) {
			return new Promise((resolve) => {
				const adapter = new FileAsync(`${path}${database}`)
				low(adapter).then((db) => {	
					var results = db.get(key).value()
					if (!query || !Array.isArray(results)) {
						resolve(results)
						return
					}
					if (!results) {
						resolve([])
						return
					}
					results = results.filter(function(item) {
					  for (var key in query) {
					    if (item[key] === undefined || item[key] != query[key])
					      return false;
					  }
					  return true;
					})
					resolve(results)
				})
			})
		},
		create(key, value) {
			return new Promise((resolve) => {
				const adapter = new FileAsync(`${path}${database}`)
				low(adapter).then(async (db) => {	
					var defaults = {}
					if (!db.get(key).value()) {
						defaults[key] = []
						await db.set(key, []).write()
					}
					db.defaults(defaults).write()
					if (typeof value === "object" && !value.id) {
						value.id = server.uuid()
					}
					db.get(key).push(value).write().then((item) => {
						resolve(value)
					})
				})
			})
		},
		update(key, id, update) {
			return new Promise((resolve) => {
				const adapter = new FileAsync(`${path}${database}`)
				low(adapter).then((db) => {	
					db.get(key).find({ id: id }).assign(update).write().then((item) => {
						resolve(update)
					})
				})
			})
		},
		set(key, value) {
			return new Promise((resolve) => {
				const adapter = new FileAsync(`${path}${database}`)
				low(adapter).then((db) => {	
					var defaults = {}
					if (!db.get(key).value()) {
						defaults[key] = []
					}
					db.defaults(defaults).write()
					db.set(key, value).write().then((item) => {
						resolve(value)
					})
				})
			})
		},
		remove(key, id) {
			return new Promise((resolve) => {
				const adapter = new FileAsync(`${path}${database}`)
				low(adapter).then((db) => {	
					db.get(key).remove({ id: id }).write().then(() => {
						resolve()
					})
				})
			})
		},
	}
}
