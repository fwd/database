const _ = require('lodash')
const server = require('@fwd/server')

const base_url = 'https://data.forward.miami'

module.exports = (config) => {

	return {
		get(key, query, database) {
			return this.find(key, query, database)
		},
		findOne(key, query, database) {
			return new Promise(async (resolve, reject) => {
				resolve( _.first( await this.find(key, query, database) ) )
			})
		},
		find(key, query, database) {
			return new Promise(async (resolve, reject) => {
				var qs = Object.keys(query || {}).map(key => `${key}=${query[key]}`).join('&');
				var response = await server.http.get(`${base_url}/${key}?apiKey=${config.apikey}&${qs}`)
				resolve(response.data.response)
			})
		},
		create(key, value, database) {
			return new Promise(async (resolve, reject) => {
				var response = await server.http.post(`${base_url}/${key}?apiKey=${config.apikey}`, value)
				resolve( response.data.response )
			})
		},
		update(key, id, update, database) {
			return new Promise(async (resolve, reject) => {
				var response = await server.http.post(`${base_url}/${key}/${id}?apiKey=${config.apikey}`, body)
				resolve( response.data.response )
			})
		},
		set(key, database) {
			return new Promise(async (resolve, reject) => {
				var response = await server.http.put(`${base_url}/${key}?apiKey=${config.apikey}`)
				resolve( response.data.response )
			})
		},
		remove(key, database) {
			return new Promise(async (resolve, reject) => {
				var response = await server.http.delete(`${base_url}/${path}?apiKey=${config.apikey}`)
				resolve( response.data.response )
			})
		},
	}

}
