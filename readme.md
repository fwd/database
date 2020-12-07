<h1 align="center">@fwd/database 💿</h1>

> A Node.js library that simplifies persistent storage.

## Description

This module exposes a function that simplifies NodeJS data storage. 

## Install

```sh
npm install @fwd/database
# or
yarn add @fwd/database
```

## Usage

### JSON File

```js

const database = require('@fwd/database')

const firebaseDatabase = database('local', {
  database: "database.json"
})

```

### Firebase Realtime Database

```js

const database = require('@fwd/database')

const firebaseDatabase = database('firebase', {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
})

```

## Author

👤  **Forward Miami**

* Github: [@fwd](https://github.com/fwd)
* Website: [https://forward.miami](https://forward.miami)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/fwd/render/issues).

## Show your support

Help us continue maintianing and making cool stuff.

[Become a sponsor to fwd](https://github.com/sponsors/fwd)

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2020 [Forward Miami](https://forward.miami).
<br />
<br />
This project is [Apache--2.0](https://github.com/forwardmiami/render/blob/master/LICENSE) licensed.
