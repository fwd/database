#!/usr/bin/env node

/**
 * Simple Database Performance Test
 * Quick benchmark of database operations
 */

const fs = require('fs')
const { performance } = require('perf_hooks')

// Import database plugins
const localDb = require('./plugins/local')
const sqliteDb = require('./plugins/sqlite3')
const lowdbDb = require('./plugins/lowdb')

async function runSimpleBenchmark() {
  console.log('🚀 Running simple database benchmark...\n')
  
  // Clean up
  if (fs.existsSync('./benchmark-data')) {
    fs.rmSync('./benchmark-data', { recursive: true, force: true })
  }
  if (fs.existsSync('benchmark-data-local')) {
    fs.rmSync('benchmark-data-local', { recursive: true, force: true })
  }
  
  // Create directory
  fs.mkdirSync('./benchmark-data', { recursive: true })
  
  const results = {}
  
  // Test data
  const testData = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zip: '12345'
    }
  }
  
  // Test Local Database
  try {
    console.log('📊 Testing Local Database...')
    const local = localDb({ path: 'benchmark-data-local', namespace: 'test' })
    
    // Write test
    const writeStart = performance.now()
    for (let i = 0; i < 100; i++) {
      await local.create('users', { ...testData, id: `user_${i}` })
    }
    const writeTime = performance.now() - writeStart
    
    // Read test
    const readStart = performance.now()
    for (let i = 0; i < 100; i++) {
      await local.find('users')
    }
    const readTime = performance.now() - readStart
    
    results.local = {
      write: Math.round(writeTime / 100 * 100) / 100,
      read: Math.round(readTime / 100 * 100) / 100
    }
    
    console.log(`✅ Local: Write ${results.local.write}ms/op, Read ${results.local.read}ms/op`)
    
  } catch (error) {
    console.log(`❌ Local failed: ${error.message}`)
    results.local = { error: error.message }
  }
  
  // Test SQLite3 Database
  try {
    console.log('📊 Testing SQLite3 Database...')
    const sqlite = sqliteDb({ file: './benchmark-data/test.sqlite' })
    
    // Write test
    const writeStart = performance.now()
    for (let i = 0; i < 100; i++) {
      await sqlite.create('users', { ...testData, id: `user_${i}` })
    }
    const writeTime = performance.now() - writeStart
    
    // Read test
    const readStart = performance.now()
    for (let i = 0; i < 100; i++) {
      await sqlite.find('users')
    }
    const readTime = performance.now() - readStart
    
    results.sqlite3 = {
      write: Math.round(writeTime / 100 * 100) / 100,
      read: Math.round(readTime / 100 * 100) / 100
    }
    
    console.log(`✅ SQLite3: Write ${results.sqlite3.write}ms/op, Read ${results.sqlite3.read}ms/op`)
    
  } catch (error) {
    console.log(`❌ SQLite3 failed: ${error.message}`)
    results.sqlite3 = { error: error.message }
  }
  
  // Test LowDB Database
  try {
    console.log('📊 Testing LowDB Database...')
    const lowdb = lowdbDb({ filepath: './benchmark-data', database: 'test.json' })
    
    // Write test
    const writeStart = performance.now()
    for (let i = 0; i < 100; i++) {
      await lowdb.create('users', { ...testData, id: `user_${i}` })
    }
    const writeTime = performance.now() - writeStart
    
    // Read test
    const readStart = performance.now()
    for (let i = 0; i < 100; i++) {
      await lowdb.find('users')
    }
    const readTime = performance.now() - readStart
    
    results.lowdb = {
      write: Math.round(writeTime / 100 * 100) / 100,
      read: Math.round(readTime / 100 * 100) / 100
    }
    
    console.log(`✅ LowDB: Write ${results.lowdb.write}ms/op, Read ${results.lowdb.read}ms/op`)
    
  } catch (error) {
    console.log(`❌ LowDB failed: ${error.message}`)
    results.lowdb = { error: error.message }
  }
  
  // Clean up
  if (fs.existsSync('./benchmark-data')) {
    fs.rmSync('./benchmark-data', { recursive: true, force: true })
  }
  if (fs.existsSync('benchmark-data-local')) {
    fs.rmSync('benchmark-data-local', { recursive: true, force: true })
  }
  
  console.log('\n📈 BENCHMARK RESULTS')
  console.log('=' * 50)
  console.log('Database | Write (ms/op) | Read (ms/op)')
  console.log('---------|---------------|-------------')
  
  for (const [db, result] of Object.entries(results)) {
    if (result.error) {
      console.log(`${db.padEnd(8)} | Error: ${result.error}`)
    } else {
      console.log(`${db.padEnd(8)} | ${result.write.toString().padEnd(13)} | ${result.read}`)
    }
  }
  
  return results
}

if (require.main === module) {
  runSimpleBenchmark().catch(console.error)
}

module.exports = { runSimpleBenchmark }
