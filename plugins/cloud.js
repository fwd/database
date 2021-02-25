const _ = require('lodash')
const server = require('@fwd/server')
module.exports = (config) => {
    config = config || {}
    var http = server.http.create({
        baseURL: (config.base_url || 'https://data.forward.miami'),
        headers: {
            "Source": "@fwd/database@0.1.10",
            "Authorization": config.apiKey || config.api_key || config.apikey || config.key
        }
    })
    function parseKey(key) {
        return key ? `${key.split('/')[0]}/${(key.split('/')[1] || 'default')}` : key
    }
    return {
        get(key, query) {
            return this.find(parseKey(key), query)
        },
        findFirst(key, query) {
            return this.findOne(parseKey(key), query)
        },
        findLast(key, query) {
            return new Promise(async (resolve, reject) => {
                resolve(_.last(await this.find(parseKey(key), query)))
            })
        },
        findOne(key, query) {
            return new Promise(async (resolve, reject) => {
                resolve(_.first(await this.find(parseKey(key), query)))
            })
        },
        find(key, query) {
            return new Promise(async (resolve, reject) => {
                var qs = Object.keys(query || {}).map(key => `${key}=${query[key]}`).join('&');
                var response = await http.get(`/${parseKey(key)}${ qs ? '?' + qs : '' }`)
                resolve(response.data.response)
            })
        },
        create(key, value) {
            return new Promise(async (resolve, reject) => {
                var response = await http.post(`/${parseKey(key)}`, value)
                resolve(response.data.response)
            })
        },
        update(key, id, update) {
            return new Promise(async (resolve, reject) => {
                var response = await http.post(`/${parseKey(key)}/${id}`, update)
                resolve(response.data.response)
            })
        },
        set(key, update) {
            return new Promise(async (resolve, reject) => {
                var response = await http.put(`/${parseKey(key)}`, {
                    change: update
                })
                resolve(response.data.response)
            })
        },
        remove(key, id) {
            return new Promise(async (resolve, reject) => {
                var response = await http.delete(`/${parseKey(key)}/${id}`)
                resolve(response.data.response)
            })
        },
    }
}
