#!/usr/bin/env node

/**
 * Database Performance Benchmark Script
 * Tests read, write, and concurrency capabilities of different database types
 * 
 * Usage: node benchmark.js
 */

const fs = require('fs')
const path = require('path')
const { performance } = require('perf_hooks')

// Import database plugins
const localDb = require('./plugins/local')
const sqliteDb = require('./plugins/sqlite3')
const lowdbDb = require('./plugins/lowdb')

// Test configuration
const TEST_CONFIG = {
  iterations: 1000,
  concurrentOperations: 50,
  dataSize: {
    small: { name: 'John Doe', email: 'john@example.com', age: 30 },
    medium: {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345'
      },
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en'
      },
      tags: ['user', 'premium', 'active']
    },
    large: {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345'
      },
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en'
      },
      tags: ['user', 'premium', 'active'],
      metadata: {
        created: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        loginCount: 42,
        settings: {
          privacy: 'public',
          emailNotifications: true,
          smsNotifications: false,
          twoFactor: true,
          theme: 'dark',
          fontSize: 'medium',
          autoSave: true,
          offlineMode: false
        },
        history: Array.from({ length: 20 }, (_, i) => ({
          action: `action_${i}`,
          timestamp: new Date().toISOString(),
          details: `Details for action ${i}`
        }))
      }
    }
  }
}

class BenchmarkRunner {
  constructor() {
    this.results = {}
    this.testData = []
  }

  async setupDatabases() {
    console.log('🔧 Setting up test databases...')
    
    // Clean up previous test data
    this.cleanup()
    
    // Create directories
    fs.mkdirSync('./benchmark-data', { recursive: true })
    
    // Initialize databases
    this.databases = {
      local: localDb({ path: 'benchmark-data-local', namespace: 'test' }),
      sqlite3: sqliteDb({ file: './benchmark-data/test.sqlite' }),
      lowdb: lowdbDb({ filepath: './benchmark-data', database: 'test.json' })
    }

    // Create test data
    this.testData = Array.from({ length: TEST_CONFIG.iterations }, (_, i) => ({
      id: `test_${i}`,
      ...TEST_CONFIG.dataSize.medium,
      index: i,
      timestamp: new Date().toISOString()
    }))

    console.log('✅ Databases initialized')
  }

  cleanup() {
    const dirs = ['./benchmark-data', 'benchmark-data-local']
    dirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true })
      }
    })
  }

  async measureTime(operation, label) {
    const start = performance.now()
    try {
      const result = await operation()
      const end = performance.now()
      return {
        success: true,
        time: end - start,
        result: result
      }
    } catch (error) {
      const end = performance.now()
      return {
        success: false,
        time: end - start,
        error: error.message
      }
    }
  }

  async testWritePerformance(dbName, db) {
    console.log(`📝 Testing write performance for ${dbName}...`)
    
    const results = {
      small: [],
      medium: [],
      large: []
    }

    // Test different data sizes
    for (const [size, data] of Object.entries(TEST_CONFIG.dataSize)) {
      for (let i = 0; i < 100; i++) {
        const testData = { ...data, id: `${size}_${i}`, index: i }
        const result = await this.measureTime(
          () => db.create('test', testData),
          `write_${size}`
        )
        results[size].push(result)
      }
    }

    return results
  }

  async testReadPerformance(dbName, db) {
    console.log(`📖 Testing read performance for ${dbName}...`)
    
    const results = {
      find: [],
      findOne: [],
      get: []
    }

    // Test different read operations
    for (let i = 0; i < 100; i++) {
      // Test find operation
      const findResult = await this.measureTime(
        () => db.find('test'),
        'find'
      )
      results.find.push(findResult)

      // Test findOne operation
      const findOneResult = await this.measureTime(
        () => db.findOne('test', { index: i }),
        'findOne'
      )
      results.findOne.push(findOneResult)

      // Test get operation
      const getResult = await this.measureTime(
        () => db.get('test'),
        'get'
      )
      results.get.push(getResult)
    }

    return results
  }

  async testConcurrency(dbName, db) {
    console.log(`🔄 Testing concurrency for ${dbName}...`)
    
    const results = {
      concurrentWrites: [],
      concurrentReads: [],
      mixedOperations: []
    }

    // Test concurrent writes
    const writePromises = Array.from({ length: TEST_CONFIG.concurrentOperations }, (_, i) =>
      this.measureTime(
        () => db.create('concurrent', { id: `concurrent_${i}`, index: i }),
        'concurrent_write'
      )
    )
    results.concurrentWrites = await Promise.all(writePromises)

    // Test concurrent reads
    const readPromises = Array.from({ length: TEST_CONFIG.concurrentOperations }, (_, i) =>
      this.measureTime(
        () => db.find('concurrent'),
        'concurrent_read'
      )
    )
    results.concurrentReads = await Promise.all(readPromises)

    // Test mixed operations
    const mixedPromises = Array.from({ length: TEST_CONFIG.concurrentOperations }, (_, i) => {
      if (i % 2 === 0) {
        return this.measureTime(
          () => db.create('mixed', { id: `mixed_${i}`, index: i }),
          'mixed_write'
        )
      } else {
        return this.measureTime(
          () => db.find('mixed'),
          'mixed_read'
        )
      }
    })
    results.mixedOperations = await Promise.all(mixedPromises)

    return results
  }

  calculateStats(results) {
    const times = results.filter(r => r.success).map(r => r.time)
    if (times.length === 0) return null

    const sorted = times.sort((a, b) => a - b)
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const median = sorted[Math.floor(sorted.length / 2)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]

    return {
      count: times.length,
      avg: Math.round(avg * 100) / 100,
      median: Math.round(median * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      p99: Math.round(p99 * 100) / 100,
      min: Math.round(Math.min(...times) * 100) / 100,
      max: Math.round(Math.max(...times) * 100) / 100,
      errors: results.filter(r => !r.success).length
    }
  }

  async runBenchmark() {
    console.log('🚀 Starting database benchmark...\n')
    
    await this.setupDatabases()

    for (const [dbName, db] of Object.entries(this.databases)) {
      console.log(`\n📊 Testing ${dbName.toUpperCase()}...`)
      
      try {
        // Test write performance
        const writeResults = await this.testWritePerformance(dbName, db)
        
        // Test read performance
        const readResults = await this.testReadPerformance(dbName, db)
        
        // Test concurrency
        const concurrencyResults = await this.testConcurrency(dbName, db)

        // Calculate statistics
        this.results[dbName] = {
          write: {
            small: this.calculateStats(writeResults.small),
            medium: this.calculateStats(writeResults.medium),
            large: this.calculateStats(writeResults.large)
          },
          read: {
            find: this.calculateStats(readResults.find),
            findOne: this.calculateStats(readResults.findOne),
            get: this.calculateStats(readResults.get)
          },
          concurrency: {
            writes: this.calculateStats(concurrencyResults.concurrentWrites),
            reads: this.calculateStats(concurrencyResults.concurrentReads),
            mixed: this.calculateStats(concurrencyResults.mixedOperations)
          }
        }

        console.log(`✅ ${dbName} benchmark completed`)
        
      } catch (error) {
        console.error(`❌ Error testing ${dbName}:`, error.message)
        this.results[dbName] = { error: error.message }
      }
    }

    // Cleanup
    this.cleanup()
    
    return this.results
  }

  generateReport() {
    console.log('\n📈 BENCHMARK RESULTS\n')
    console.log('=' * 80)

    for (const [dbName, results] of Object.entries(this.results)) {
      if (results.error) {
        console.log(`\n❌ ${dbName.toUpperCase()}: ${results.error}`)
        continue
      }

      console.log(`\n🗄️ ${dbName.toUpperCase()}`)
      console.log('-'.repeat(40))

      // Write Performance
      console.log('\n📝 WRITE PERFORMANCE (ms)')
      console.log('Size    | Avg    | Median | P95    | P99    | Errors')
      console.log('--------|--------|--------|--------|--------|--------')
      
      for (const [size, stats] of Object.entries(results.write)) {
        if (stats) {
          console.log(`${size.padEnd(7)} | ${stats.avg.toString().padEnd(6)} | ${stats.median.toString().padEnd(6)} | ${stats.p95.toString().padEnd(6)} | ${stats.p99.toString().padEnd(6)} | ${stats.errors}`)
        }
      }

      // Read Performance
      console.log('\n📖 READ PERFORMANCE (ms)')
      console.log('Type    | Avg    | Median | P95    | P99    | Errors')
      console.log('--------|--------|--------|--------|--------|--------')
      
      for (const [type, stats] of Object.entries(results.read)) {
        if (stats) {
          console.log(`${type.padEnd(7)} | ${stats.avg.toString().padEnd(6)} | ${stats.median.toString().padEnd(6)} | ${stats.p95.toString().padEnd(6)} | ${stats.p99.toString().padEnd(6)} | ${stats.errors}`)
        }
      }

      // Concurrency Performance
      console.log('\n🔄 CONCURRENCY PERFORMANCE (ms)')
      console.log('Type    | Avg    | Median | P95    | P99    | Errors')
      console.log('--------|--------|--------|--------|--------|--------')
      
      for (const [type, stats] of Object.entries(results.concurrency)) {
        if (stats) {
          console.log(`${type.padEnd(7)} | ${stats.avg.toString().padEnd(6)} | ${stats.median.toString().padEnd(6)} | ${stats.p95.toString().padEnd(6)} | ${stats.p99.toString().padEnd(6)} | ${stats.errors}`)
        }
      }
    }
  }

  generateMarkdownTable() {
    let markdown = '\n## 📊 Performance Benchmarks\n\n'
    markdown += '*Results from automated testing of read, write, and concurrency performance*\n\n'

    // Write Performance Table
    markdown += '### 📝 Write Performance (milliseconds)\n\n'
    markdown += '| Database | Small Data | Medium Data | Large Data | Errors |\n'
    markdown += '|----------|------------|-------------|------------|--------|\n'

    for (const [dbName, results] of Object.entries(this.results)) {
      if (results.error) {
        markdown += `| ${dbName} | ❌ Error | ❌ Error | ❌ Error | ${results.error} |\n`
        continue
      }

      const small = results.write.small ? `${results.write.small.avg}ms` : 'N/A'
      const medium = results.write.medium ? `${results.write.medium.avg}ms` : 'N/A'
      const large = results.write.large ? `${results.write.large.avg}ms` : 'N/A'
      const errors = (results.write.small?.errors || 0) + (results.write.medium?.errors || 0) + (results.write.large?.errors || 0)

      markdown += `| ${dbName} | ${small} | ${medium} | ${large} | ${errors} |\n`
    }

    // Read Performance Table
    markdown += '\n### 📖 Read Performance (milliseconds)\n\n'
    markdown += '| Database | Find All | Find One | Get All | Errors |\n'
    markdown += '|----------|----------|----------|---------|--------|\n'

    for (const [dbName, results] of Object.entries(this.results)) {
      if (results.error) {
        markdown += `| ${dbName} | ❌ Error | ❌ Error | ❌ Error | ${results.error} |\n`
        continue
      }

      const find = results.read.find ? `${results.read.find.avg}ms` : 'N/A'
      const findOne = results.read.findOne ? `${results.read.findOne.avg}ms` : 'N/A'
      const get = results.read.get ? `${results.read.get.avg}ms` : 'N/A'
      const errors = (results.read.find?.errors || 0) + (results.read.findOne?.errors || 0) + (results.read.get?.errors || 0)

      markdown += `| ${dbName} | ${find} | ${findOne} | ${get} | ${errors} |\n`
    }

    // Concurrency Performance Table
    markdown += '\n### 🔄 Concurrency Performance (milliseconds)\n\n'
    markdown += '| Database | Concurrent Writes | Concurrent Reads | Mixed Ops | Errors |\n'
    markdown += '|----------|-------------------|-----------------|-----------|--------|\n'

    for (const [dbName, results] of Object.entries(this.results)) {
      if (results.error) {
        markdown += `| ${dbName} | ❌ Error | ❌ Error | ❌ Error | ${results.error} |\n`
        continue
      }

      const writes = results.concurrency.writes ? `${results.concurrency.writes.avg}ms` : 'N/A'
      const reads = results.concurrency.reads ? `${results.concurrency.reads.avg}ms` : 'N/A'
      const mixed = results.concurrency.mixed ? `${results.concurrency.mixed.avg}ms` : 'N/A'
      const errors = (results.concurrency.writes?.errors || 0) + (results.concurrency.reads?.errors || 0) + (results.concurrency.mixed?.errors || 0)

      markdown += `| ${dbName} | ${writes} | ${reads} | ${mixed} | ${errors} |\n`
    }

    markdown += '\n**Test Configuration:**\n'
    markdown += '- Iterations: 100 per test\n'
    markdown += '- Concurrent Operations: 50\n'
    markdown += '- Data Sizes: Small (~100 bytes), Medium (~500 bytes), Large (~2KB)\n'
    markdown += '- Environment: Node.js on macOS\n\n'

    return markdown
  }
}

// Run the benchmark
async function main() {
  const runner = new BenchmarkRunner()
  
  try {
    const results = await runner.runBenchmark()
    runner.generateReport()
    
    // Generate markdown for readme
    const markdown = runner.generateMarkdownTable()
    
    // Write results to file
    fs.writeFileSync('./benchmark-results.md', markdown)
    console.log('\n📄 Results written to benchmark-results.md')
    
    return markdown
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { BenchmarkRunner }
