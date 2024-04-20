const cache = require('./cache')
module.exports = (key, value, exp, callback) => {
    if (key && typeof value != 'undefined') {
        cache.put(key, value, exp, function(key, value) {
            if (callback) callback(key, value)
        })
        return
    }
    if (key && typeof value == 'undefined') {
        return cache.get(key)
    }
}
