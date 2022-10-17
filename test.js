const database = require('./index')('sqlite')

// console.log( database )

database.create('users', { name: 'John' }).then((data) => {
	console.log(data)
})

// database.get('users', { name: 'John' }).then((data) => {
// 	console.log(data)
// })