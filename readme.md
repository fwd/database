<h1 align="center">@fwd/database ⚡️</h1>

> JSON database for NodeJS. Support for local and remote storage, without changing code.

## Install

```sh
npm install fwd/database
```

## Usage

```js

const database = require('@fwd/database')('local')

;(async () => {

	const model = 'users'
  	
	// create user
	await database.create(model, {
		name: "Elon",
		company: "Tesla"
	})
	
	// find user
	var user = await database.findOne(model, {
		name: "Elon",
		company: "Tesla"
	})
	
	// update user
	await database.update(model, user.id, {
	   company: "Tesla, SpaceX"
	})
	
	// delete user
	await database.delete(model, user.id)
  
})()

```

### Local

```js

const database = require('@fwd/database')('local', {
	namespace: 'my_app'
})

const database2 = require('@fwd/database')('local', {
	namespace: 'another_app'
})

```

### Database Types - Cloud

```js

const database = require('@fwd/database')('cloud', {
    key: 'API_KEY'
})

```

For a Free API Key & More information @ [cloudjson.io](https://cloudjson.io)


### API Methods

```js

;(async () => {
	
	// find objects
	await database.get('model', query)
	await database.find('model', query)
	await database.findOne('model', query)
	await database.findFirst('model', query)
	await database.findLast('model', query)
	
	// create object
	await database.create('model', options})
	
	// update objects
	await database.update('model', object.id, update)
	
	// set object (used for complete overidding of object)
	await database.set('model', object.id, override)
	
	// delete objects
	await database.delete('model', object.id)
	await database.remove('model', object.id)
  
})()

```


## Author

👤  **Forward Miami**

* Github: [@fwd](https://github.com/fwd)
* Website: [https://forward.miami](https://forward.miami)

## 🤝 Contributing

Give a ⭐️ if this project helped you!

Contributions, issues and feature requests are welcome! <br />Feel free to check [issues page](https://github.com/fwd/database/issues).

## 📝 License

MIT License

Copyright © 2021 [Forward Miami](https://forward.miami).

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
