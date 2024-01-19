![Cover](https://raw.githubusercontent.com/fwd/database/master/.github/banner.png)

## Install

Latest Version
```sh
npm install fwd/database
```

Stable Version
```sh
npm install @fwd/database
```

## Setup

```js
const lowDb = require('@fwd/database')('lowdb') // json flat file
const localDb = require('@fwd/database')('local') // json multi-file
const mongoDb = require('@fwd/database')('sqlite') // in development
const mongoDb = require('@fwd/database')('mongodb') // coming soon
const mySQL = require('@fwd/database')('mysql') // coming soon
```

## Use
```js

// initalize database
const database = require('@fwd/database')('local')

;(async () => {
  	
	// create user
	await database.create('users', {
		fname: "Leeroy",
		company: "WoW"
	})
	
	// find user
	var user = await database.findOne('users', {
		fname: "Leeroy"
	})
	
	// update user
	await database.update('users', user.id, {
	   lname: "Jenkins"
	})
	
	// delete user
	await database.delete('users', user.id)
  
})()

```

### API

```js

;(async () => {
	
	// find users
	await database.get('users') // returns all
	await database.find('users', { id: 2 }) // array
	await database.findOne('users', { id: 2 }) // object
	await database.findFirst('users', query) 
	await database.findLast('users', query)
	
	// query users (advanced)
	await database.query('users', '[country=NZ].name')
	
	// create user
	var user = await database.create('users', { fname: "John" })
	
	// update users
	await database.update('users', user.id, { lname: "Doe" })
	
	// set user (used for complete overidding of object)
	await database.set('users', user.id, { fname: "John" })
	
	// delete users
	await database.delete('users', user.id)
	
	// delete alias
	await database.remove('users', user.id)
  
})()

```

### Multiple Instances

```js

const database = require('@fwd/database')('local', {
	namespace: 'my_app'
})

const database2 = require('@fwd/database')('local', {
	namespace: 'another_app'
})

```

## 🤝 Contributing

Give a ⭐️ if this project helped you!

Contributions, issues and feature requests are welcome! Feel free to check [issues page](https://github.com/fwd/database/issues).

## 📝 License

MIT License

Copyright © [nano2dev](https://twitter.com/nano2dev).

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Stargazers

[![Stargazers over time](https://starchart.cc/fwd/database.svg)](https://starchart.cc/fwd/database)
