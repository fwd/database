const _ = require('lodash')
const server = require('@fwd/server')

module.exports = (config) => {

	config = config || {}

	const base_url = config.base_url || 'https://data.forward.miami'
	
	const api_key = config.api_key || config.apikey || config.key

	server.http.defaults.headers.common = { "Authorization": api_key }

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
				var response = await server.http.get(`${base_url}/${key}${ qs ? '?' + qs : '' }`)
				resolve(response.data.response)
			})
		},

		create(key, value) {
			return new Promise(async (resolve, reject) => {
				var response = await server.http.post(`${base_url}/${key}`, value)
				resolve( response.data.response )
			})
		},

		update(key, id, update) {
			return new Promise(async (resolve, reject) => {
				var response = await server.http.post(`${base_url}/${key}/${id}`, update)
				resolve( response.data.response )
			})
		},

		set(key, update) {
			return new Promise(async (resolve, reject) => {
				var response = await server.http.put(`${base_url}/${key}`, {
					change: update
				})
				resolve( response.data.response )
			})
		},

		remove(key, id) {
			return new Promise(async (resolve, reject) => {
				var response = await server.http.delete(`${base_url}/${key}/${id}`)
				resolve( response.data.response )
			})
		},

	}

}
