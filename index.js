module.exports = (plugin, config) => {

	plugin = plugin.toLowerCase()
	plugin = plugin || ''

	if (plugin === 'cloud') {
		return require('./plugins/cloud')(config)
	}

	if (plugin === 'local') {
		return require('./plugins/local')(config)
	}

	if (plugin === 'firebase') {
		return require('./plugins/firebase')(config)
	}

	console.log('Plugin not supported, yet.')

}
