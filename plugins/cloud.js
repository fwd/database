const _ = require('lodash')
const server = require('@fwd/server')

module.exports = (config) => {

	const base_url = config.base_url || 'https://data.forward.miami'

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
			return new Promise(async (resolve, reject) => {
				var qs = Object.keys(query || {}).map(key => `${key}=${query[key]}`).join('&');
				var response = await server.http.get(`${base_url}/${key}?apiKey=${config.apikey}&${qs}`)
				resolve(response.data.response)
			})
		},

		create(key, value) {
			return new Promise(async (resolve, reject) => {
				var response = await server.http.post(`${base_url}/${key}?apiKey=${config.apikey}`, value)
				resolve( response.data.response )
			})
		},

		update(key, id, update) {
			return new Promise(async (resolve, reject) => {
				var response = await server.http.post(`${base_url}/${key}/${id}?apiKey=${config.apikey}`, update)
				resolve( response.data.response )
			})
		},

		set(key) {
			return new Promise(async (resolve, reject) => {
				var response = await server.http.put(`${base_url}/${key}?apiKey=${config.apikey}`)
				resolve( response.data.response )
			})
		},

		remove(key) {
			return new Promise(async (resolve, reject) => {
				var response = await server.http.delete(`${base_url}/${path}?apiKey=${config.apikey}`)
				resolve( response.data.response )
			})
		},

	}

}
