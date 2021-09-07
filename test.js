const database = require('./index')()

// const database = require('./index')('cloud', {
// 	mothership: 'http://localhost:82'
// })

;(async () => {

	var name = "Jack"

	var user = await database.findOne('users', { name })

	if (!user) {
		// create user
		console.log(`Creating ${name}`)
		await database.create('users', { name })
		// console.log( user )
	}

	console.log(`Fiding him`)
	var user = await database.findOne('users', { name })
	console.log(`Found him`, user)

	// update user
	console.log(`Giving him 6 kids`)
	var user = await database.update('users', user.id, { kids: 6 })
	// console.log( user )

	// update user
	console.log(`Deleting ${name}`)
	await database.remove('users', user.id)

	// removing evidence
	var user = await database.findOne('users', { name })
	if (user) console.log( "Oh oh. He is still alive", user)
	// if (user) throw new Error( "Oh oh. He is still alive", user )
	if (!user) console.log( "Could not find him" )
	// console.log( "Oh oh. He is still alive" || "Could not find him" )	

})()