module.exports = (plugin, config) => {

	plugin = plugin.toLowerCase()
	plugin = plugin || ''

	if (plugin === 'cloud') {
		return require('./plugin/cloud')(config)
	}

	if (plugin === 'local') {
		return require('./plugin/local')(config)
	}

	if (plugin === 'firebase') {
		const firebase = require('firebase/app');
			  require('firebase/database');
		return require('./plugin/firebase')(config)
	}

	console.log('Plugin not supported, yet.')

}
