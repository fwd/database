
module.exports = (config) => {

    config = config || {}
    
    const base_path = config.filepath || config.base_path || config.basepath || config.path
    const database_name = config.database || config.filename || config.namespace

    return {
        list(model) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        get(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        getFirst(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        getLast(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        findFirst(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        findLast(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        findOne(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        pluck(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        paginate(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        findOne(mode, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        find(model, query) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        create(model, value) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        update(model, id, update) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        set(model, value) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        remove(model, id) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
        delete(model, id) {
            return new Promise(async (resolve, reject) => {
                resolve()
            })
        },
    }

}
