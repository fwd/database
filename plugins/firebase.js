const _ = require('lodash');
const firebase = require('firebase/app');
				 require('firebase/database');

module.exports = (config) => {

	firebase.initializeApp(config)

	var database = firebase.database()

	return {
		findOne: (key, query) => {
			return _.first( this.find(key, query) )
		},
		findFirst: (key, query) => {
			return _.first( this.find(key, query) )
		},
		findLast: (key, query) => {
			return _.last( this.find(key, query) )
		},
		get: (key, query) => {
			return this.find(key, query)
		},
		find: (key, query) => {
			return new Promise((resolve, reject) => {

				database.ref(key).once('value').then(function(snapshot) {

					var results = []

					if (typeof snapshot.val() === 'string') {
						resolve(snapshot.val())
					}

					for (var key in snapshot.val()) {
						results.push(snapshot.val()[key])
					}

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

				});
			})
		},
		set: (key, value) => {
			return new Promise((resolve, reject) => {
				database.ref(key).set(value, function(error) {
				    if (!error) {
				      resolve(value)
				    }
				})
			})
		},
		create: (key, value) => {
			return new Promise((resolve, reject) => {
				var useShortId = server.cache('admin') && server.cache('admin').shortId
				if (value && !value.id) {
					value.id = useShortId ? server.uuid().split('-')[0] : server.uuid()
				}
				database.ref(`${config.domain}/${key}/${value.id}`).set(value, function(error) {
				    if (!error) {
				      resolve(value)
				    }
				})
			})
		},
		update: (key, id, update) => {
			return new Promise((resolve, reject) => {
				database.ref(`${key}/${id}`).update(update, function(error) {
				    if (!error) {
				      resolve(update)
				    }
				})
			})
		},
		remove: (key, id) => {
			this.update(key, id, null)
		},
	}

}
