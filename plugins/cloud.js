const _ = require('lodash')
const server = require('@fwd/server')
module.exports = (config) => {
    config = config || {}
    var package = require('../package.json')
    var headers = {
        baseURL: (config.base_url || 'https://json.miami'),
        headers: {
             "Authorization": config.apiKey || config.api_key || config.apikey || config.key
        }
    }
    if (config.telemetry) {
        headers.headers["Package-Name"] = package.name
        headers.headers["Package-Version"] = package.version
    }
    var http = server.http.create(headers)
    return {
        get(key, query) {
            return this.find(key, query)
        },
        findFirst(key, query) {
            return this.findOne(key, query)
        },
        findLast(key, query) {
            return new Promise(async (resolve, reject) => {
                resolve(_.last(await this.find(key, query)))
            })
        },
        findOne(key, query) {
            return new Promise(async (resolve, reject) => {
                resolve(_.first(await this.find(key, query)))
            })
        },
        paginate(key, query) {
            return new Promise(async (resolve, reject) => {
                var qs = Object.keys(query || {}).map(key => `${key}=${query[key]}`).join('&');
                var response = await http.get(`/data/${key === '/' ? '' : key}${ qs ? '?' + qs : '' }`)
                resolve(response.data.response)
            })
        },
        find(key, query) {
            return new Promise(async (resolve, reject) => {
                var qs = Object.keys(query || {}).map(key => `${key}=${query[key]}`).join('&');
                var response = await http.get(`/data/${key === '/' ? '' : key}${ qs ? '?' + qs : '' }`)
                resolve(response.data.response.data)
            })
        },
        create(key, value) {
            return new Promise(async (resolve, reject) => {
                var response = await http.post(`/data/${key === '/' ? '' : key}`, value)
                resolve(response.data.response)
            })
        },
        update(key, id, update) {
            return new Promise(async (resolve, reject) => {
                var response = await http.post(`/data/${key}/${id}`, update)
                resolve(response.data.response)
            })
        },
        set(key, update) {
            return new Promise(async (resolve, reject) => {
                var response = await http.put(`/data/${key}`, update)
                resolve(response.data.response)
            })
        },
        remove(key, id) {
            return new Promise(async (resolve, reject) => {
                var response = await http.delete(`/data/${key}/${id}`)
                resolve(response.data.response)
            })
        },
    }
}
