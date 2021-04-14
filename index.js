module.exports = (plugin, config) => {

	config = config || {}
	plugin = (plugin || '').toLowerCase()

	try	{

		if (plugin === 'lowdb') {
			return require('./plugins/lowdb')(config)
		}

		if (plugin === 'local') {
			return require('./plugins/json')(config)
		}
		
		if (plugin === 'local2') {
			return require('./plugins/json2')(config)
		}

		if (plugin === 'cloud' || plugin === 'forward') {
			return require('./plugins/cloud')(config)
		}

		console.warn('Database Error: Plugin not provided or not supported. Create an issue to request support: https://github.com/fwd/database/issues')
	
	} catch (e) {
		console.log("Database Error:", e)
	}

}
