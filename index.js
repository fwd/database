module.exports = (plugin, config) => {

	config = config || {}
	plugin = (plugin || '').toLowerCase()

	if (!plugin) {
		plugin = 'local'
		console.warn('Database: No plugin set. Defaulting to local. Docs: https://github.com/fwd/database')
	}

	try	{

		if (plugin === 'lowdb') return require('./plugins/lowdb')(config)
		if (plugin === 'local') return require('./plugins/local')(config)
		// if (plugin === 'mongodb') return require('./plugins/mongodb')(config)
		if (plugin === 'sqlite') return require('./plugins/sqlite')(config)
		// if (plugin === 'mariadb') return require('./plugins/mariadb')(config)
		// if (plugin === 'mysql') return require('./plugins/mysql')(config)
		if (plugin === 'cloud' || plugin === 'remote') return require('./plugins/cloud')(config)

		return console.error('Database: Plugin not provided or supported. Request: https://github.com/fwd/database/issues')
		
	} catch (e) {
		console.error("Database:", e)
	}

}
