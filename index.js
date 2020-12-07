module.exports = (plugin, config) => {

	plugin = plugin.toLowerCase()

	try	{

		if (plugin === 'cloud' || plugin === 'forward') {
			if (!config) {
				return console.warn('Database Error: Missing config parameter.')
			}
			return require('./plugins/forward')(config)
		}

		if (plugin === 'local') {
			return require('./plugins/local')(config)
		}

		if (plugin === 'firebase') {
			if (!config) {
				return console.warn('Database Error: Missing config parameter.')
			}
			return require('./plugins/firebase')(config)
		}

		console.warn('Database Error: Plugin not provided or not supported. Create an issue to request support: https://github.com/fwd/database/issues')
	
	} catch (e) {
		console.log("Database Error:", e.message)
	}

}
