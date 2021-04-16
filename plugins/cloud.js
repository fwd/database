const _ = require('lodash')
const server = require('@fwd/server')
module.exports = (config) => {

    config = config || {}

    var headers = {
        baseURL: (config.base_url || 'https://cloudjson.io/api'),
        headers: {
            "Authorization": config.apiKey || config.api_key || config.apikey || config.key
        }
    }
    
    if (config.telemetry) {
        var package = require('../package.json')
        headers.headers["Package-Name"] = package.name
        headers.headers["Package-Version"] = package.version
    }

    const http = server.http.create(headers)

    function namespace(model) {
        model = model === '/' ? '' : model
        if (model.includes('/')) {
            return `/${model}`
        } else {
            return `/${ config.namespace || 'default' }/${model}`
        }
    }
    
    return {
        get(key, query) {
            return this.find(key, query)
        },
        findFirst(key, query) {
            return this.findOne(key, query)
        },
        findLast(key, query) {
            return new Promise(async (resolve, reject) => {
                var paginated = await this.find(key, query)
                resolve(_.last(paginated.data))
            })
        },
        findOne(key, query) {
            return new Promise(async (resolve, reject) => {
                var paginated = await this.find(key, query)
                resolve(_.first(paginated.data))
            })
        },
        find(key, query) {
            return new Promise(async (resolve, reject) => {
                var qs = Object.keys(query || {}).map(key => `${key}=${query[key]}`).join('&');
                var response = await http.get(`${namespace(key)}${ qs ? '?' + qs : '' }`)
                resolve(response.data.response)
            })
        },
        create(key, value) {
            return new Promise(async (resolve, reject) => {
                var response = await http.post(namespace(key), value)
                resolve(response.data.response)
            })
        },
        update(key, id, update) {
            return new Promise(async (resolve, reject) => {
                var response = await http.post(`${namespace(key)}/${id}`, update)
                resolve(response.data.response)
            })
        },
        set(key, update) {
            return new Promise(async (resolve, reject) => {
                var response = await http.put(namespace(key), update)
                resolve(response.data.response)
            })
        },
        remove(key, id) {
            return new Promise(async (resolve, reject) => {
                var response = await http.delete(`${namespace(key)}/${id}`)
                resolve(response.data.response)
            })
        },
    }

}
