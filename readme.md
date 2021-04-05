<h1 align="center">@fwd/database 💿</h1>

> A NodeJS package that exposes a simple JSON database. 

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

## Author

👤  **Forward Miami**

* Github: [@fwd](https://github.com/fwd)
* Website: [https://forward.miami](https://forward.miami)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/fwd/render/issues).

Give a ⭐️ if this project helped you!

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