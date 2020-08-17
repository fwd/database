const firebase = require('firebase/app');
require('firebase/database');

module.exports = (plugin, config) => {

	plugin = plugin.toLowerCase()
	plugin = plugin || ''

	if (plugin === 'local') {
		return require('./plugin/local')(config)
	}

	if (plugin === 'firebase') {
		return require('./plugin/firebase')(config)
	}

	console.log('Plugin not supported, yet.')

}
