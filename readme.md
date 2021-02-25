<h1 align="center">@fwd/database 💿</h1>

> A NodeJS package that exposes an simlpe API for persistent storage. Support for local and remote.

## Install

```sh
npm install fwd/database
```

## Usage

### Local JSON File

```js

const database = require('@fwd/database')('local', {
    database: "database.json"
})

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

### Cloud Stored JSON

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
