const _ = require('lodash')
const server = require('@fwd/server')
module.exports = (config) => {

    config = config || {}

    var baseURL = config.base_url || config.base || config.url ||config.source || config.mothership

    if (!baseURL) {
        throw new Error("Remote base URL is required.")
        return
    }

    var apiKey = config.apiKey || config.api_key || config.apikey || config.key

    var headers = { baseURL, headers: { "Authorization": apiKey || '' } }

    if (config.headers) Object.keys(config.headers).map(a => headers.headers[a] = config.headers[a])
    
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
            return `/${model}`
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
                var results = await this.find(key, query)
                resolve(results && Array.isArray(results) ? _.first(results) : null)
            })
        },

        find(key, query) {
            return new Promise(async (resolve, reject) => {
                var qs = Object.keys(query || {}).map(key => `${key}=${query[key]}`).join('&');
                var response = await http.get(`${namespace(key)}${ qs ? '?' + qs : '' }`)
                if (response.data.error) throw Error(response.data.error)
                resolve(response.data)
            })
        },

        create(key, value) {
            return new Promise(async (resolve, reject) => {
                var response = await http.post(namespace(key), value)
                if (response.data.error) throw Error(response.data.error)
                resolve(response.data)
            })
        },

        update(key, id, update) {
            return new Promise(async (resolve, reject) => {
                var response = await http.post(`${namespace(key)}/${id}`, update)
                if (response.data.error) throw Error(response.data.error)
                resolve(response.data)
            })
        },

        set(key, update) {
            return new Promise(async (resolve, reject) => {
                var response = await http.put(namespace(key), update)
                if (response.data.error) throw Error(response.data.error)
                resolve(response.data)
            })
        },

        remove(key, id) {
            return new Promise(async (resolve, reject) => {
                var response = await http.delete(`${namespace(key)}/${id}`)
                if (response.data.error) throw Error(response.data.error)
                resolve(response.data)
            })
        },

    }

}
