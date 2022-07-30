module.exports = (plugin, config) => {

	config = config || {}
	plugin = (plugin || '').toLowerCase()

	if (!plugin) {
		plugin = 'local'
		console.warn('Database Notice: No plugin name supplied. Defaulting to local. Docs: https://github.com/fwd/database')
	}

	try	{

		if (plugin === 'lowdb') return require('./plugins/lowdb')(config)
		if (plugin === 'local') return require('./plugins/local')(config)
		if (plugin === 'mongodb') return require('./plugins/mongodb')(config)
		if (plugin === 'sqlite3') return require('./plugins/sqlite3')(config)
		if (plugin === 'mariadb') return require('./plugins/mariadb')(config)
		if (plugin === 'mysql') return require('./plugins/mysql')(config)
		if (plugin === 'cloud' || plugin === 'remote') return require('./plugins/cloud')(config)

		return console.error('Database Error: Plugin not provided or not supported. Add an issue: https://github.com/fwd/database/issues')
		
	} catch (e) {
		console.log("Database Error:", e)
	}

}
