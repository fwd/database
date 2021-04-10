
module.exports = (config) => {

    const base_path = config.filepath || config.base_path || config.basepath
    const database_name = config.database || config.filename

    return {
        list(model) {},
        get(model, query) {},
        findFirst(model, query) {},
        findLast(model, query) {},
        findOne(model, query) {},
        paginate(model, query) {},
        find(model, query) {},
        create(model, value) {},
        update(model, id, update) {},
        set(model, value) {},
        remove(model, id) {},
    }
}
