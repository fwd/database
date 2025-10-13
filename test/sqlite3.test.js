const database = require('../index');
const fs = require('fs-extra');
const path = require('path');

describe('SQLite3 Plugin Tests', () => {
  let db;
  const testConfig = {
    file: './test-data/sqlite3/test-database.sqlite'
  };

  beforeEach(async () => {
    db = database('sqlite3', testConfig);
    await fs.ensureDir(path.dirname(testConfig.file));
  });

  afterEach(async () => {
    await fs.remove('./test-data/sqlite3');
  });

  describe('Configuration and Initialization', () => {
    test('should initialize with default configuration', () => {
      const defaultDb = database('sqlite3');
      expect(defaultDb).toBeDefined();
    });

    test('should initialize with custom file path', () => {
      const customConfig = { file: './custom-database.sqlite' };
      const customDb = database('sqlite3', customConfig);
      expect(customDb).toBeDefined();
    });

    test('should initialize with string configuration', () => {
      const customDb = database('sqlite3', 'custom-database.sqlite');
      expect(customDb).toBeDefined();
    });

    test('should initialize with various config aliases', () => {
      const configs = [
        { name: 'test.sqlite' },
        { filepath: 'test.sqlite' },
        { base_path: 'test.sqlite' },
        { basepath: 'test.sqlite' },
        { database: 'test.sqlite' },
        { namespace: 'test.sqlite' },
        { path: 'test.sqlite' }
      ];

      configs.forEach(config => {
        const customDb = database('sqlite3', config);
        expect(customDb).toBeDefined();
      });
    });

    test('should initialize with memory database', () => {
      const memoryDb = database('sqlite3', { file: 'memory' });
      expect(memoryDb).toBeDefined();
    });

    test('should initialize with :memory: database', () => {
      const memoryDb = database('sqlite3', { file: ':memory:' });
      expect(memoryDb).toBeDefined();
    });

    test('should initialize with custom timestamp keys', () => {
      const customConfig = {
        file: './test-data/sqlite3/custom-timestamps.sqlite',
        created_key: 'custom_created',
        updated_key: 'custom_updated'
      };
      const customDb = database('sqlite3', customConfig);
      expect(customDb).toBeDefined();
    });
  });

  describe('Table Creation', () => {
    test('should create table automatically on first create', async () => {
      const testData = { name: 'Test User', email: 'test@example.com' };
      const result = await db.create('users', testData);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test User');
      expect(result.email).toBe('test@example.com');
    });

    test('should create table with custom columns', async () => {
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        age: 25,
        active: true,
        metadata: JSON.stringify({ role: 'admin' })
      };
      const result = await db.create('users', testData);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Test User');
      expect(result.email).toBe('test@example.com');
      expect(result.age).toBe(25);
      expect(result.active).toBe(true);
    });

    test('should handle createTable method directly', async () => {
      const columns = ['name', 'email', 'age'];
      await expect(db.createTable('test_table', columns)).resolves.toBeUndefined();
    });

    test('should handle migrations', async () => {
      const migration = jest.fn((db) => {
        return new Promise((resolve) => {
          db.run('CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, name TEXT)', resolve);
        });
      });

      const configWithMigrations = {
        file: './test-data/sqlite3/migrations-test.sqlite',
        migrations: [migration]
      };

      const migrationDb = database('sqlite3', configWithMigrations);
      await migrationDb.create('users', { name: 'Test User' });

      expect(migration).toHaveBeenCalled();
    });
  });

  describe('Create Operations', () => {
    test('should create a single record', async () => {
      const testData = createTestData().user;
      const result = await db.create('users', testData);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(testData.name);
      expect(result.email).toBe(testData.email);
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    test('should create record with custom ID', async () => {
      const testData = { id: 999, name: 'Test User' };
      const result = await db.create('users', testData);
      
      expect(result.id).toBe(999);
      expect(result.name).toBe('Test User');
    });

    test('should create record with UUID', async () => {
      const testData = { uuid: 'custom-uuid', name: 'Test User' };
      const result = await db.create('users', testData);
      
      expect(result.uuid).toBe('custom-uuid');
      expect(result.name).toBe('Test User');
    });

    test('should create empty record', async () => {
      const result = await db.create('users', {});
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    test('should handle various data types', async () => {
      const testData = {
        name: 'Test User',
        age: 25,
        active: true,
        score: 98.5,
        metadata: JSON.stringify({ role: 'user' }),
        tags: JSON.stringify(['tag1', 'tag2'])
      };
      const result = await db.create('users', testData);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Test User');
      expect(result.age).toBe(25);
      expect(result.active).toBe(true);
      expect(result.score).toBe(98.5);
    });
  });

  describe('Read Operations', () => {
    beforeEach(async () => {
      // Create test data
      await db.create('users', { name: 'Alice', email: 'alice@example.com', age: 25 });
      await db.create('users', { name: 'Bob', email: 'bob@example.com', age: 30 });
      await db.create('users', { name: 'Charlie', email: 'charlie@example.com', age: 35 });
    });

    test('should find all records', async () => {
      const results = await db.find('users');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3);
      expect(results[0].name).toBeDefined();
    });

    test('should find records with query', async () => {
      const results = await db.find('users', { name: 'Alice' });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Alice');
    });

    test('should find records with multiple conditions', async () => {
      const results = await db.find('users', { name: 'Alice', age: 25 });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Alice');
    });

    test('should find single record by ID', async () => {
      const user = await db.create('users', { name: 'Test User' });
      const result = await db.find('users', { id: user.id });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Test User');
    });

    test('should find single record by numeric ID', async () => {
      const user = await db.create('users', { name: 'Test User' });
      const result = await db.find('users', user.id);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Test User');
    });

    test('should find first record', async () => {
      const result = await db.findFirst('users');
      
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
    });

    test('should find first record with query', async () => {
      const result = await db.findFirst('users', { age: 25 });
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Alice');
    });

    test('should find last record', async () => {
      const result = await db.findLast('users', {});
      
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
    });

    test('should find one record', async () => {
      const result = await db.findOne('users', { name: 'Alice' });
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Alice');
    });

    test('should find one record by numeric ID', async () => {
      const user = await db.create('users', { name: 'Test User' });
      const result = await db.findOne('users', user.id);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Test User');
    });

    test('should return empty array for non-existent table', async () => {
      const results = await db.find('non-existent');
      expect(results).toEqual([]);
    });

    test('should list all records', async () => {
      const results = await db.list('users');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3);
    });
  });

  describe('Update Operations', () => {
    let userId;

    beforeEach(async () => {
      const user = await db.create('users', { name: 'Original Name', email: 'original@example.com' });
      userId = user.id;
    });

    test('should update existing record', async () => {
      const updateData = { name: 'Updated Name', age: 30 };
      const result = await db.update('users', userId, updateData);
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
    });

    test('should update record with empty update object', async () => {
      const result = await db.update('users', userId, {});
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
    });

    test('should handle update on non-existent record', async () => {
      const updateData = { name: 'Updated Name' };
      const result = await db.update('users', 99999, updateData);
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(0);
    });

    test('should update multiple fields', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        age: 30,
        active: true
      };
      const result = await db.update('users', userId, updateData);
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
    });

    test('should update timestamp on update', async () => {
      const originalUser = await db.findOne('users', { id: userId });
      const originalUpdated = originalUser.updated_at;
      
      await waitFor(10); // Small delay to ensure timestamp difference
      
      const result = await db.update('users', userId, { name: 'Updated' });
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
      
      const updatedUser = await db.findOne('users', { id: userId });
      expect(updatedUser.updated_at).not.toBe(originalUpdated);
    });
  });

  describe('Set Operations', () => {
    let userId;

    beforeEach(async () => {
      const user = await db.create('users', { name: 'Original Name', email: 'original@example.com' });
      userId = user.id;
    });

    test('should set complete object', async () => {
      const testData = { id: userId, name: 'Set Name', email: 'set@example.com', age: 25 };
      const result = await db.set('users', testData);
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
    });

    test('should reject set without ID', async () => {
      const testData = { name: 'Set Name', email: 'set@example.com' };
      
      await expect(db.set('users', testData))
        .rejects.toThrow('ID is required to update the record.');
    });

    test('should update timestamp on set', async () => {
      const originalUser = await db.findOne('users', { id: userId });
      const originalUpdated = originalUser.updated_at;
      
      await waitFor(10); // Small delay to ensure timestamp difference
      
      const testData = { id: userId, name: 'Set Name' };
      const result = await db.set('users', testData);
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
      
      const updatedUser = await db.findOne('users', { id: userId });
      expect(updatedUser.updated_at).not.toBe(originalUpdated);
    });
  });

  describe('Delete Operations', () => {
    let userId;

    beforeEach(async () => {
      const user = await db.create('users', { name: 'To Delete' });
      userId = user.id;
    });

    test('should delete existing record', async () => {
      const result = await db.remove('users', userId);
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
      
      const deletedUser = await db.findOne('users', { id: userId });
      expect(deletedUser).toBeUndefined();
    });

    test('should handle delete on non-existent record', async () => {
      const result = await db.remove('users', 99999);
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(0);
    });

    test('should delete using delete alias', async () => {
      const result = await db.delete('users', userId);
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
    });
  });

  describe('Raw SQL Operations', () => {
    beforeEach(async () => {
      await db.create('users', { name: 'Alice', age: 25 });
      await db.create('users', { name: 'Bob', age: 30 });
    });

    test('should execute raw SELECT query', async () => {
      const results = await db.raw('SELECT * FROM users WHERE age > ?', [25]);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Bob');
    });

    test('should execute raw COUNT query', async () => {
      const results = await db.raw('SELECT COUNT(*) as count FROM users');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].count).toBe(2);
    });

    test('should execute raw query with multiple parameters', async () => {
      const results = await db.raw('SELECT * FROM users WHERE age BETWEEN ? AND ?', [20, 30]);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
    });

    test('should execute raw query without parameters', async () => {
      const results = await db.raw('SELECT * FROM users');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
    });

    test('should handle raw query errors', async () => {
      await expect(db.raw('SELECT * FROM non_existent_table'))
        .rejects.toThrow();
    });
  });

  describe('Concurrency Tests', () => {
    test('should handle concurrent creates', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(db.create('users', { name: `User ${i}`, index: i }));
      }
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(5);
      results.forEach((result, index) => {
        expect(result.name).toBe(`User ${index}`);
        expect(result.index).toBe(index);
      });
    });

    test('should handle concurrent reads', async () => {
      // Create some test data
      await db.create('users', { name: 'Test User 1' });
      await db.create('users', { name: 'Test User 2' });
      
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        promises.push(db.find('users'));
      }
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
      });
    });

    test('should handle concurrent updates', async () => {
      const user = await db.create('users', { name: 'Original', counter: 0 });
      
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        promises.push(db.update('users', user.id, { counter: i + 1 }));
      }
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.affectedRows).toBe(1);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle special characters in data', async () => {
      const testData = {
        name: 'Test "User" with \'quotes\'',
        description: 'Line 1\nLine 2\tTabbed',
        unicode: '测试用户 🚀',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
      };
      
      const result = await db.create('users', testData);
      expect(result).toBeDefined();
      expect(result.name).toBe(testData.name);
      expect(result.description).toBe(testData.description);
      expect(result.unicode).toBe(testData.unicode);
      expect(result.symbols).toBe(testData.symbols);
    });

    test('should handle null and undefined values', async () => {
      const testData = {
        name: 'Test User',
        nullField: null,
        undefinedField: undefined,
        emptyString: '',
        zeroValue: 0,
        falseValue: false
      };
      
      const result = await db.create('users', testData);
      expect(result).toBeDefined();
      expect(result.name).toBe('Test User');
      expect(result.nullField).toBeNull();
      expect(result.undefinedField).toBeUndefined();
      expect(result.emptyString).toBe('');
      expect(result.zeroValue).toBe(0);
      expect(result.falseValue).toBe(false);
    });

    test('should handle very long strings', async () => {
      const longString = 'x'.repeat(10000);
      const testData = { name: 'Test User', longData: longString };
      
      const result = await db.create('users', testData);
      expect(result).toBeDefined();
      expect(result.longData).toBe(longString);
    });

    test('should handle JSON data', async () => {
      const jsonData = { 
        metadata: { role: 'admin', permissions: ['read', 'write'] },
        tags: ['tag1', 'tag2', 'tag3'],
        settings: { theme: 'dark', notifications: true }
      };
      
      const result = await db.create('users', jsonData);
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.tags).toBeDefined();
      expect(result.settings).toBeDefined();
    });

    test('should handle numeric edge cases', async () => {
      const testData = {
        name: 'Test User',
        maxInt: Number.MAX_SAFE_INTEGER,
        minInt: Number.MIN_SAFE_INTEGER,
        maxFloat: Number.MAX_VALUE,
        minFloat: Number.MIN_VALUE,
        infinity: Infinity,
        negativeInfinity: -Infinity,
        notANumber: NaN
      };
      
      const result = await db.create('users', testData);
      expect(result).toBeDefined();
      expect(result.maxInt).toBe(Number.MAX_SAFE_INTEGER);
      expect(result.minInt).toBe(Number.MIN_SAFE_INTEGER);
    });
  });

  describe('API Consistency', () => {
    test('should provide all required methods', () => {
      const requiredMethods = [
        'raw', 'list', 'findFirst', 'findLast', 'findOne', 'find',
        'create', 'createTable', 'update', 'set', 'remove', 'delete',
        'get', 'getFirst', 'getLast'
      ];
      
      requiredMethods.forEach(method => {
        expect(typeof db[method]).toBe('function');
      });
    });

    test('should handle get alias correctly', async () => {
      await db.create('users', { name: 'Test User' });
      
      const result1 = await db.get('users');
      const result2 = await db.find('users');
      
      expect(result1).toEqual(result2);
    });

    test('should handle getFirst alias correctly', async () => {
      await db.create('users', { name: 'First User' });
      await db.create('users', { name: 'Second User' });
      
      const result1 = await db.getFirst('users');
      const result2 = await db.findFirst('users');
      
      expect(result1).toEqual(result2);
    });

    test('should handle getLast alias correctly', async () => {
      await db.create('users', { name: 'First User' });
      await db.create('users', { name: 'Last User' });
      
      const result1 = await db.getLast('users', {});
      const result2 = await db.findLast('users', {});
      
      expect(result1).toEqual(result2);
    });
  });

  describe('Database File Management', () => {
    test('should create database file on first operation', async () => {
      const dbPath = testConfig.file;
      
      // Ensure file doesn't exist initially
      expect(await fs.pathExists(dbPath)).toBe(false);
      
      // Perform operation
      await db.create('users', { name: 'Test User' });
      
      // Check file was created
      expect(await fs.pathExists(dbPath)).toBe(true);
    });

    test('should handle existing database file', async () => {
      const dbPath = testConfig.file;
      
      // Create empty file first
      await fs.writeFile(dbPath, '');
      
      // Should work normally
      const result = await db.create('users', { name: 'Test User' });
      expect(result).toBeDefined();
    });

    test('should handle memory database', async () => {
      const memoryDb = database('sqlite3', { file: 'memory' });
      
      const result = await memoryDb.create('users', { name: 'Memory User' });
      expect(result).toBeDefined();
      expect(result.name).toBe('Memory User');
    });
  });
});
