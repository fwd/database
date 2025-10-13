const fs = require('fs-extra');
const path = require('path');

// Global test setup
beforeAll(async () => {
  // Create test directories
  const testDirs = [
    './test-data',
    './test-data/local',
    './test-data/lowdb',
    './test-data/sqlite3',
    './test-data/cache'
  ];
  
  for (const dir of testDirs) {
    await fs.ensureDir(dir);
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // Clean up test data directories
    const testDirs = [
      './test-data/local',
      './test-data/lowdb',
      './test-data/sqlite3',
      './test-data/integration',
      './test-data/error-handling'
    ];
    
    for (const dir of testDirs) {
      if (await fs.pathExists(dir)) {
        await fs.remove(dir);
      }
    }
    
    // Clean up individual test files
    const testFiles = [
      './test-data/test-database.json',
      './test-data/test-database.sqlite',
      './test-data/test-database.db'
    ];
    
    for (const file of testFiles) {
      if (await fs.pathExists(file)) {
        await fs.remove(file);
      }
    }
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    await fs.remove('./test-data');
  } catch (error) {
    console.warn('Final cleanup warning:', error.message);
  }
});

// Helper function to create test data
global.createTestData = () => ({
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    active: true
  },
  users: [
    { name: 'Alice', email: 'alice@example.com', age: 25 },
    { name: 'Bob', email: 'bob@example.com', age: 35 },
    { name: 'Charlie', email: 'charlie@example.com', age: 28 }
  ],
  product: {
    name: 'Test Product',
    price: 99.99,
    category: 'electronics',
    inStock: true
  }
});

// Helper function to wait for async operations
global.waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock console methods to avoid test output noise
const originalConsole = { ...console };
global.mockConsole = () => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
};

global.restoreConsole = () => {
  Object.assign(console, originalConsole);
};
