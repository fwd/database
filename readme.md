# 🗄️ @fwd/database

**The Everyman's Multi-Database Package** - Switch between SQL and local storage with zero migration headaches!

![Cover](https://raw.githubusercontent.com/fwd/database/master/.github/banner.png)

## 🚀 What is this?

Think of `@fwd/database` as your universal database adapter. Whether you're building a quick prototype with local files or deploying to production with SQLite, you use the **exact same code**. No more rewriting your database logic when you switch storage types!

**Perfect for:**
- 🏗️ **Prototyping** - Start with local files, scale to SQL
- 🔄 **Easy Migration** - Switch database types without changing your code
- 🎯 **Simple Projects** - No complex setup, just works
- 🚀 **Production Apps** - Battle-tested with multiple database engines

---

## 📦 Installation

### Latest Version (Recommended)
```bash
npm install @fwd/database
```

### From GitHub (Cutting Edge)
```bash
npm install fwd/database
```

---

## ⚡ Quick Start

### 1. Choose Your Database Type

```javascript
// Local files (perfect for development)
const db = require('@fwd/database')('local')

// SQLite (great for production)
const db = require('@fwd/database')('sqlite3')

// LowDB (JSON-based, simple)
const db = require('@fwd/database')('lowdb')
```

### 2. Start Using It Immediately

```javascript
const database = require('@fwd/database')('local')

;(async () => {
  // Create a user
  const user = await database.create('users', {
    name: "John Doe",
    email: "john@example.com",
    age: 30
  })
  
  // Find the user
  const foundUser = await database.findOne('users', {
    name: "John Doe"
  })
  
  // Update the user
	await database.update('users', user.id, {
    age: 31
	})
	
  // Delete the user
	await database.delete('users', user.id)
})()
```

**That's it!** No configuration, no setup, no migrations. Just works! 🎉

---

## 🗃️ Supported Database Types

### 🏠 Local (Default)
**Perfect for:** Development, prototyping, small projects

```javascript
const db = require('@fwd/database')('local')
// Creates individual JSON files for each collection
// Files stored in ./data/ by default
```

**Pros:** Zero setup, human-readable files, perfect for development
**Cons:** Not ideal for high-concurrency production use

### 🗄️ SQLite3
**Perfect for:** Production apps, desktop applications, embedded systems

```javascript
const db = require('@fwd/database')('sqlite3')
// Creates a single SQLite database file
// Supports migrations and complex queries
```

**Pros:** Production-ready, ACID compliant, supports migrations
**Cons:** Requires SQLite3 dependency

### 📄 LowDB
**Perfect for:** Simple projects, configuration storage, small datasets

```javascript
const db = require('@fwd/database')('lowdb')
// Creates a single JSON file for all data
// Great for configuration and simple data storage
```

**Pros:** Simple JSON storage, lightweight, easy to backup
**Cons:** Single file can become large, not ideal for complex queries

---

## 🔧 Configuration Options

### Basic Configuration

```javascript
// Local database with custom path
const db = require('@fwd/database')('local', {
  path: './my-data',           // Where to store files
  namespace: 'my-app'          // Unique namespace for your app
})

// SQLite with custom file
const db = require('@fwd/database')('sqlite3', {
  file: './my-app.sqlite'      // Database file location
})

// LowDB with custom file
const db = require('@fwd/database')('lowdb', {
  filepath: './data',          // Directory for database file
  database: 'my-app.json'      // Database filename
})
```

### Advanced SQLite Configuration

```javascript
const db = require('@fwd/database')('sqlite3', {
  file: './production.sqlite',
  migrations: './migrations',           // Primary migrations (camelCase)
  allowModifiedMigrations: false,          // Prevent running modified migrations
  debug: true,                             // Enable debug logging for migrations
  migrations: [                            // Legacy: inline migrations (still supported)
    // Run migrations on startup
    async (db) => {
      await db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE
      )`)
    }
  ]
})
```

### 🔧 Migration Path Configuration

The migration system supports multiple configuration options with intelligent fallbacks:

**Priority Order:**
1. `migrations` - Primary configuration option
4. `./migrations` - Default fallback

**Automatic Fallback Paths:**
If the configured path doesn't exist, the system will automatically search for migrations in:
- `./migrations`
- `./db/migrations`
- `./database/migrations`
- `{project_root}/migrations`
- `{project_root}/db/migrations`

**Examples:**

```javascript
// Custom migrations directory
const db = require('@fwd/database')('sqlite3', {
  file: './app.sqlite',
  migrations: './database/migrations'
})

// Alternative naming conventions
const db = require('@fwd/database')('sqlite3', {
  file: './app.sqlite',
  migrations: './db/migrations'  // snake_case
})

const db = require('@fwd/database')('sqlite3', {
  file: './app.sqlite',
  migrations: './database/migrations'  // camelCase
})

// Debug mode to see path resolution
const db = require('@fwd/database')('sqlite3', {
  file: './app.sqlite',
  debug: true  // Shows which path is being used
})

// Check current migrations path
console.log('Migrations path:', db.getmigrations())
```

---

## 📚 Complete API Reference

### 🔍 Reading Data

```javascript
// Get all records from a collection
const allUsers = await database.get('users')
// Returns: [{ id: 'abc123', name: 'John', ... }, ...]

// Find records matching criteria
const activeUsers = await database.find('users', { active: true })
// Returns: Array of matching records

// Find the first matching record
const firstUser = await database.findOne('users', { name: 'John' })
// Returns: Single object or undefined

// Find the last matching record
const lastUser = await database.findLast('users', { active: true })
// Returns: Single object or undefined

// Advanced querying (JSON query syntax)
const nzUsers = await database.query('users', '[country=NZ].name')
// Returns: Names of users from New Zealand
```

### ✏️ Writing Data

```javascript
// Create a new record
const newUser = await database.create('users', {
  name: 'Jane Doe',
  email: 'jane@example.com',
  age: 25
})
// Returns: { id: 'generated-id', name: 'Jane Doe', ... }

// Update an existing record
const updatedUser = await database.update('users', userId, {
  age: 26,
  lastLogin: new Date()
})
// Returns: Updated record

// Replace entire record
const replacedUser = await database.set('users', userId, {
  name: 'Jane Smith',
  email: 'jane.smith@example.com'
})
// Returns: New record (completely replaces old one)

// Delete a record
await database.delete('users', userId)
// Returns: Deleted record

// Alternative delete method
await database.remove('users', userId)
// Same as delete()
```

---

## 🔄 Database Migrations (SQLite Only)

**Say goodbye to migration headaches!** The SQLite plugin includes a powerful migration system that automatically detects and runs new migrations.

### 🚀 Quick Migration Setup

```javascript
const database = require('@fwd/database')('sqlite3', {
  file: './my-app.sqlite',
  migrations: './migrations'  // Directory for migration files
})

// Migrations run automatically when you first create data!
const user = await database.create('users', { name: 'John' })
// ✅ Migrations executed automatically
```

### 📁 Migration Files

Create migration files in your `migrations` directory. Both JavaScript and SQL files are supported:

#### JavaScript Migrations

```javascript
// migrations/001_create_users_table.js
module.exports = {
    up: async (db) => {
        await new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            `, (err) => {
                if (err) reject(err)
                else resolve()
            })
        })
    },
    
    down: async (db) => {
        await new Promise((resolve, reject) => {
            db.run('DROP TABLE IF EXISTS users', (err) => {
                if (err) reject(err)
                else resolve()
            })
        })
    }
}
```

#### SQL Migrations

```sql
-- migrations/002_create_products_table.sql
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
```

### 🛠️ Migration Management

```javascript
// Check migration status
const status = await database.getMigrationStatus()
console.log('Executed migrations:', status.executed.length)
console.log('Pending migrations:', status.pending.length)
console.log('Modified migrations:', status.modified.length)

// Create a new migration
const migrationPath = await database.createMigration('add_user_roles')
console.log('Created migration:', migrationPath)

// Run migrations manually
await database.runMigrations()

// Rollback a migration (if it has a down function)
await database.rollbackMigration('001_create_users_table.js')
```

### 🔒 Migration Safety Features

**Automatic Checksum Validation:**
- Detects if migration files have been modified since execution
- Prevents accidental re-running of modified migrations
- Configurable with `allowModifiedMigrations: true`

**Execution Tracking:**
- Tracks which migrations have been executed
- Stores execution timestamps and file checksums
- Prevents duplicate execution

**Error Handling:**
- Graceful error handling with detailed logging
- Failed migrations don't break your app
- Clear error messages for debugging

### 📋 Migration Best Practices

#### 1. Use Descriptive Names
```javascript
// ✅ Good
await database.createMigration('add_user_email_verification')
await database.createMigration('create_product_categories_table')

// ❌ Avoid
await database.createMigration('update')
await database.createMigration('fix')
```

#### 2. Always Include Down Migrations
```javascript
module.exports = {
    up: async (db) => {
        // Add your changes
        await db.run('ALTER TABLE users ADD COLUMN verified INTEGER DEFAULT 0')
    },
    
    down: async (db) => {
        // Remove your changes
        // Note: SQLite doesn't support DROP COLUMN easily
        // You might need to recreate the table
        console.log('⚠️ Manual cleanup required for SQLite')
    }
}
```

#### 3. Test Your Migrations
```javascript
// Test migration in development
const testDb = database('sqlite3', {
  file: ':memory:',  // In-memory database for testing
  migrations: './migrations'
})

await testDb.runMigrations()
// Test your app logic here
```

### 🔄 Migration Workflow Example

```javascript
// 1. Development: Create migration
const migrationPath = await database.createMigration('add_user_profiles')
// Creates: migrations/2024-01-15T10-30-00_add_user_profiles.js

// 2. Edit the migration file
// migrations/2024-01-15T10-30-00_add_user_profiles.js
module.exports = {
    up: async (db) => {
        await db.run(`
            CREATE TABLE user_profiles (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                bio TEXT,
                avatar_url TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `)
    },
    
    down: async (db) => {
        await db.run('DROP TABLE user_profiles')
    }
}

// 3. Deploy: Migrations run automatically
const user = await database.create('users', { name: 'John' })
// ✅ Migration executed automatically

// 4. Check status
const status = await database.getMigrationStatus()
console.log(`✅ ${status.executed.length} migrations executed`)
console.log(`⏳ ${status.pending.length} migrations pending`)
```

### 🚨 Troubleshooting Migrations

**Q: "Modified migrations detected" error**
```javascript
// Option 1: Allow modified migrations (use with caution)
const db = database('sqlite3', {
  allowModifiedMigrations: true
})

// Option 2: Create a new migration instead of modifying existing ones
```

**Q: Migration fails to run**
```javascript
// Check migration status
const status = await database.getMigrationStatus()
console.log('Pending migrations:', status.pending)
console.log('Modified migrations:', status.modified)

// Run migrations manually with error details
try {
  await database.runMigrations()
} catch (error) {
  console.error('Migration error:', error.message)
}
```

**Q: Need to rollback a migration**
```javascript
// Only works if migration has a 'down' function
await database.rollbackMigration('001_create_users_table.js')
```

---

## 🔄 Database Migration Made Easy

**The magic of @fwd/database:** Switch between database types without changing your code!

### Example: Local → SQLite Migration

```javascript
// Step 1: Your app works with local files
const localDb = require('@fwd/database')('local')

// Step 2: Later, switch to SQLite for production
const sqliteDb = require('@fwd/database')('sqlite3')

// Step 3: Migrate your data (one-time)
const migrateData = async () => {
  const users = await localDb.find('users')
  
  for (const user of users) {
    await sqliteDb.create('users', user)
  }
  
  console.log(`Migrated ${users.length} users to SQLite!`)
}

// Step 4: Update your app to use SQLite
const database = sqliteDb // Just change this line!
```

### Example: Development → Production Workflow

```javascript
// Development (local files)
const devDb = require('@fwd/database')('local', {
  namespace: 'my-app-dev'
})

// Production (SQLite)
const prodDb = require('@fwd/database')('sqlite3', {
  file: './production.sqlite'
})

// Use environment variable to switch
const database = process.env.NODE_ENV === 'production' 
  ? prodDb 
  : devDb

// Your code never changes!
const user = await database.create('users', { name: 'John' })
```

---

## 💡 Real-World Examples

### Example 1: Simple Blog System

```javascript
const database = require('@fwd/database')('local')

class Blog {
  async createPost(title, content, author) {
    return await database.create('posts', {
      title,
      content,
      author,
      createdAt: new Date(),
      published: false
    })
  }
  
  async publishPost(postId) {
    return await database.update('posts', postId, {
      published: true,
      publishedAt: new Date()
    })
  }
  
  async getPublishedPosts() {
    return await database.find('posts', { published: true })
  }
  
  async getPostByAuthor(author) {
    return await database.find('posts', { author })
  }
}

// Usage
const blog = new Blog()
const post = await blog.createPost('My First Post', 'Hello world!', 'John')
await blog.publishPost(post.id)
const publishedPosts = await blog.getPublishedPosts()
```

### Example 2: User Management System

```javascript
const database = require('@fwd/database')('sqlite3')

class UserManager {
  async registerUser(userData) {
    // Check if user already exists
    const existing = await database.findOne('users', { 
      email: userData.email 
    })
    
    if (existing) {
      throw new Error('User already exists')
    }
    
    return await database.create('users', {
      ...userData,
      createdAt: new Date(),
      active: true
    })
  }
  
  async loginUser(email, password) {
    const user = await database.findOne('users', { 
      email, 
      password, // In real apps, hash passwords!
      active: true 
    })
    
    if (user) {
      await database.update('users', user.id, {
        lastLogin: new Date()
      })
    }
    
    return user
  }
  
  async deactivateUser(userId) {
    return await database.update('users', userId, {
      active: false,
      deactivatedAt: new Date()
    })
  }
}
```

### Example 3: Configuration Management

```javascript
const database = require('@fwd/database')('lowdb')

class ConfigManager {
  async setConfig(key, value) {
    return await database.set('config', key, {
      value,
      updatedAt: new Date()
    })
  }
  
  async getConfig(key) {
    const config = await database.findOne('config', { id: key })
    return config ? config.value : null
  }
  
  async getAllConfigs() {
    const configs = await database.find('config')
    return configs.reduce((acc, config) => {
      acc[config.id] = config.value
      return acc
    }, {})
  }
}

// Usage
const config = new ConfigManager()
await config.setConfig('app_name', 'My Awesome App')
await config.setConfig('max_users', 1000)
const appName = await config.getConfig('app_name')
```

---

## 🔧 Advanced Usage

### Custom Timestamps

```javascript
const database = require('@fwd/database')('sqlite3', {
  created_key: 'created_at',
  updated_key: 'updated_at'
})

const user = await database.create('users', { name: 'John' })
// Automatically adds: created_at and updated_at timestamps
```

### Memory Database (SQLite)

```javascript
const database = require('@fwd/database')('sqlite3', {
  file: 'memory' // or ':memory:'
})

// Perfect for testing - data disappears when process ends
```

### Multiple Database Instances

```javascript
// Different apps can use different databases
const userDb = require('@fwd/database')('local', {
  namespace: 'user-management'
})

const productDb = require('@fwd/database')('sqlite3', {
  file: './products.sqlite'
})

// Each database is completely separate
await userDb.create('users', { name: 'John' })
await productDb.create('products', { name: 'Widget' })
```

### Error Handling

```javascript
const database = require('@fwd/database')('local')

try {
  const user = await database.create('users', { name: 'John' })
  console.log('User created:', user)
} catch (error) {
  console.error('Database error:', error.message)
}

// Handle non-existent records gracefully
const user = await database.findOne('users', { id: 'non-existent' })
if (user) {
  console.log('User found:', user)
} else {
  console.log('User not found')
}
```

---

## 🚨 Troubleshooting

### Common Issues

**Q: "Plugin not supported" error**
```javascript
// ❌ Wrong
const db = require('@fwd/database')('mysql') // Not implemented yet

// ✅ Correct
const db = require('@fwd/database')('sqlite3') // Use supported plugin
```

**Q: Data not persisting**
```javascript
// ❌ Wrong - using memory database
const db = require('@fwd/database')('sqlite3', { file: 'memory' })

// ✅ Correct - specify file path
const db = require('@fwd/database')('sqlite3', { file: './my-app.sqlite' })
```

**Q: Permission errors on file creation**
```bash
# Make sure the directory is writable
chmod 755 ./data
```

**Q: SQLite database locked**
```javascript
// This usually means another process is using the database
// Make sure to close connections properly or use different file names
```

### Debug Mode

```javascript
// Enable debug logging
const database = require('@fwd/database')('local', {
  debug: true // Shows all database operations
})
```

---

## 🎯 Best Practices

### 1. Use Environment-Based Configuration

```javascript
const config = {
  development: {
    type: 'local',
    options: { namespace: 'dev' }
  },
  production: {
    type: 'sqlite3',
    options: { file: './production.sqlite' }
  }
}

const env = process.env.NODE_ENV || 'development'
const database = require('@fwd/database')(
  config[env].type, 
  config[env].options
)
```

### 2. Always Handle Errors

```javascript
const safeCreate = async (collection, data) => {
  try {
    return await database.create(collection, data)
  } catch (error) {
    console.error(`Failed to create ${collection}:`, error.message)
    throw error
  }
}
```

### 3. Use Meaningful Collection Names

```javascript
// ✅ Good
await database.create('users', userData)
await database.create('products', productData)
await database.create('orders', orderData)

// ❌ Avoid
await database.create('data', userData)
await database.create('stuff', productData)
```

### 4. Implement Data Validation

```javascript
const createUser = async (userData) => {
  // Validate required fields
  if (!userData.email || !userData.name) {
    throw new Error('Email and name are required')
  }
  
  // Check for duplicates
  const existing = await database.findOne('users', { 
    email: userData.email 
  })
  
  if (existing) {
    throw new Error('User already exists')
  }
  
  return await database.create('users', userData)
}
```

---

## 🔮 Coming Soon

- 🍃 **MongoDB** support
- 🐬 **MySQL** support  
- 🐘 **PostgreSQL** support
- 🔍 **Advanced querying** with SQL-like syntax
- 📊 **Database analytics** and performance metrics
- 🔄 **Automatic migrations** between database types

---

## 🤝 Contributing

We love contributions! Here's how you can help:

1. **⭐ Star this repo** if it helped you
2. **🐛 Report bugs** on our [issues page](https://github.com/fwd/database/issues)
3. **💡 Suggest features** - what would make this package better?
4. **🔧 Submit pull requests** - we welcome code contributions!

### Development Setup

```bash
git clone https://github.com/fwd/database.git
cd database
npm install
npm test
```

---

## 📄 License

MIT License - feel free to use this in your projects!

Copyright © [nano2dev](https://twitter.com/nano2dev)

---

## 🌟 Stargazers

[![Stargazers over time](https://starchart.cc/fwd/database.svg)](https://starchart.cc/fwd/database)

---

**Made with ❤️ by the Fresh Web Designs team**

*Questions? Issues? Feature requests? [Open an issue](https://github.com/fwd/database/issues) and we'll help you out!*