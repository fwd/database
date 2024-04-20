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
		// if (plugin === 'mongodb') return require('./plugins/mongodb')(config)
		// if (plugin === 'mariadb') return require('./plugins/mariadb')(config)
		// if (plugin === 'mysql') return require('./plugins/mysql')(config)
		if (plugin === 'sqlite3' || plugin === 'sqlite') return require('./plugins/sqlite3')(config)

		return console.error(`Database Error: Plugin '${plugin}' not supported yet. Create issue on Github: https://github.com/fwd/database/issues`)
		
	} catch (e) {
		console.log("Database Error:", e)
	}

}
