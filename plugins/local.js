const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileAsync')

module.exports = (config) => {

	return {
		find(key, query, database) {
			return new Promise((resolve) => {
				const path = server.path ? server.path + '/' : './'
				const adapter = new FileSync(`${path}${database ? database + '.json' : 'db.json'}`)
				low(adapter).then((db) => {	
					var results = db.get(key).value()
					if (!query) {
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
		create(key, value, database) {
			return new Promise((resolve) => {
				const path = server.path ? server.path + '/' : './'
				const adapter = new FileSync(`${path}${database ? database + '.json' : 'db.json'}`)
				low(adapter).then((db) => {	
					var defaults = {}
					if (!db.get(key).value()) {
						defaults[key] = []
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
		update(key, id, update, database) {
			return new Promise((resolve) => {
				const path = server.path ? server.path + '/' : './'
				const adapter = new FileSync(`${path}${database ? database + '.json' : 'db.json'}`)
				low(adapter).then((db) => {	
					db.get(key).find({ id: id }).assign(update).write().then((item) => {
						resolve(update)
					})
				})
			})
		},
		remove(key, id, database) {
			return new Promise((resolve) => {
				const path = server.path ? server.path + '/' : './'
				const adapter = new FileSync(`${path}${database ? database + '.json' : 'db.json'}`)
				low(adapter).then((db) => {	
					db.get(key).remove({ id: id }).write().then(() => {
						resolve()
					})
				})
			})
		},
	}

}
