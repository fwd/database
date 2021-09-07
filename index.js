module.exports = (plugin, config) => {

	config = config || {}
	plugin = (plugin || '').toLowerCase()

	if (!plugin) {
		plugin = 'local'
		console.log('Database Notice: No plugin supplied. Defaulting to local. More info: https://github.com/fwd/database')
	}

	try	{

		if (plugin === 'lowdb') {
			return require('./plugins/LowDB')(config)
		}

		if (plugin === 'local') {
			return require('./plugins/local')(config)
		}
		
		if (plugin === 'cloud' || plugin === 'remote' || plugin === 'internet') {
			return require('./plugins/cloud')(config)
		}

		console.warn('Database Error: Plugin not provided or not supported. Create an issue to request support: https://github.com/fwd/database/issues')
		
		return
		
	} catch (e) {
		console.log("Database Error:", e)
	}

}
