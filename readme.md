<h1 align="center">@fwd/database 💿</h1>

> A NodeJS package that exposes a rudimentary DaaS (database as a service) for local and cloud JSON storage.

## Install

```sh
npm install fwd/database
```

## Usage

```js

;(async () => {
  	
	// create entry
	await database.create('users', {
		name: "Elon Musk",
		company: "Tesla"
	})
	
	// find entry
	var elon = await database.find('users', {
		name: "Elon Musk"
	})
  
})()

```

### Database Types - Local

```js

const database = require('@fwd/database')('local', {
    database: "database.json"
})

```

### Database Types - Cloud

```js

const database = require('@fwd/database')('cloud', {
    key: 'API_KEY'
})

```

Our cloud JSON storage service is in private beta. If you'd like to use, please contact us. 

## Author

👤  **Forward Miami**

* Github: [@fwd](https://github.com/fwd)
* Website: [https://forward.miami](https://forward.miami)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/fwd/render/issues).

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2021 [Forward Miami](https://forward.miami).

MIT Open Source License
