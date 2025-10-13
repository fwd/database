const database = require('../index');
const fs = require('fs-extra');
const path = require('path');

describe('LowDB Plugin Tests', () => {
  let db;
  const testConfig = {
    filepath: './test-data/lowdb',
    database: 'test-database.json'
  };

  beforeEach(async () => {
    db = database('lowdb', testConfig);
    await fs.ensureDir(testConfig.filepath);
  });

  afterEach(async () => {
    await fs.remove('./test-data/lowdb');
  });

  describe('Configuration and Initialization', () => {
    test('should initialize with default configuration', () => {
      const defaultDb = database('lowdb');
      expect(defaultDb).toBeDefined();
    });

    test('should initialize with custom filepath', () => {
      const customConfig = {
        filepath: './custom-path',
        database: 'custom-db.json'
      };
      const customDb = database('lowdb', customConfig);
      expect(customDb).toBeDefined();
    });

    test('should initialize with base_path alias', () => {
      const config = { base_path: './test-data/lowdb', filename: 'test.json' };
      const customDb = database('lowdb', config);
      expect(customDb).toBeDefined();
    });

    test('should initialize with basepath alias', () => {
      const config = { basepath: './test-data/lowdb', namespace: 'test.json' };
      const customDb = database('lowdb', config);
      expect(customDb).toBeDefined();
    });

    test('should handle database name without .json extension', () => {
      const config = { database: 'test-database' };
      const customDb = database('lowdb', config);
      expect(customDb).toBeDefined();
    });

    test('should handle database name with .json extension', () => {
      const config = { database: 'test-database.json' };
      const customDb = database('lowdb', config);
      expect(customDb).toBeDefined();
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
    });

    test('should create record with existing ID', async () => {
      const testData = { id: 'existing-id', name: 'Test User' };
      const result = await db.create('users', testData);
      
      expect(result.id).toBe('existing-id');
      expect(result.name).toBe('Test User');
    });

    test('should create record without ID (auto-generate)', async () => {
      const testData = { name: 'Test User', email: 'test@example.com' };
      const result = await db.create('users', testData);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test User');
    });

    test('should create empty record', async () => {
      const result = await db.create('users', {});
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    test('should create multiple records', async () => {
      const testData = createTestData().users;
      const results = [];
      
      for (const user of testData) {
        const result = await db.create('users', user);
        results.push(result);
      }
      
      expect(results.length).toBe(testData.length);
      results.forEach((result, index) => {
        expect(result.name).toBe(testData[index].name);
        expect(result.id).toBeDefined();
      });
    });

    test('should initialize collection on first create', async () => {
      const testData = { name: 'First User' };
      const result = await db.create('new-collection', testData);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('First User');
      
      // Verify the collection was created
      const allRecords = await db.find('new-collection');
      expect(allRecords.length).toBe(1);
    });
  });

  describe('Read Operations', () => {
    beforeEach(async () => {
      // Create test data
      await db.create('users', createTestData().users[0]);
      await db.create('users', createTestData().users[1]);
      await db.create('users', createTestData().users[2]);
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

    test('should find single record by ID', async () => {
      const user = await db.create('users', { name: 'Test User' });
      const result = await db.find('users', { id: user.id });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Test User');
    });

    test('should find single record by string ID', async () => {
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

    test('should find last record', async () => {
      const result = await db.findLast('users');
      
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
    });

    test('should find one record', async () => {
      const result = await db.findOne('users', { name: 'Alice' });
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Alice');
    });

    test('should return empty array for non-existent collection', async () => {
      const results = await db.find('non-existent');
      expect(results).toEqual([]);
    });

    test('should return null for empty collection', async () => {
      const results = await db.find('empty-collection');
      expect(results).toBeNull();
    });

    test('should handle query with multiple conditions', async () => {
      await db.create('users', { name: 'Alice', age: 25, active: true });
      await db.create('users', { name: 'Alice', age: 30, active: false });
      
      const results = await db.find('users', { name: 'Alice', active: true });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].age).toBe(25);
    });

    test('should handle query with undefined values', async () => {
      await db.create('users', { name: 'Alice', age: 25 });
      await db.create('users', { name: 'Bob', age: undefined });
      
      const results = await db.find('users', { age: undefined });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Bob');
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
      expect(result.name).toBe('Updated Name');
      expect(result.age).toBe(30);
    });

    test('should update record with empty update object', async () => {
      const result = await db.update('users', userId, {});
      
      expect(result).toBeDefined();
    });

    test('should handle update on non-existent record', async () => {
      const updateData = { name: 'Updated Name' };
      const result = await db.update('users', 'non-existent-id', updateData);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Name');
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
      expect(result.name).toBe('Updated Name');
      expect(result.email).toBe('updated@example.com');
      expect(result.age).toBe(30);
      expect(result.active).toBe(true);
    });
  });

  describe('Set Operations', () => {
    test('should set complete array', async () => {
      const testData = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' }
      ];
      const result = await db.set('users', testData);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    test('should set single object', async () => {
      const testData = { id: '1', name: 'Single User' };
      const result = await db.set('users', testData);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Single User');
    });

    test('should set empty array', async () => {
      const result = await db.set('users', []);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('should replace existing data', async () => {
      // First create some data
      await db.create('users', { name: 'Original User' });
      
      // Then replace with new data
      const newData = [{ name: 'New User 1' }, { name: 'New User 2' }];
      const result = await db.set('users', newData);
      
      expect(result).toBeDefined();
      
      // Verify old data is gone
      const allUsers = await db.find('users');
      expect(allUsers.length).toBe(2);
      expect(allUsers[0].name).toBe('New User 1');
      expect(allUsers[1].name).toBe('New User 2');
    });
  });

  describe('Delete Operations', () => {
    let userId;

    beforeEach(async () => {
      const user = await db.create('users', { name: 'To Delete' });
      userId = user.id;
    });

    test('should delete existing record', async () => {
      await expect(db.remove('users', userId)).resolves.toBeUndefined();
      
      const result = await db.find('users', { id: userId });
      expect(result).toEqual([]);
    });

    test('should handle delete on non-existent record', async () => {
      await expect(db.remove('users', 'non-existent-id')).resolves.toBeUndefined();
    });

    test('should delete multiple records with same ID', async () => {
      // Create multiple records with same ID (edge case)
      await db.create('users', { id: 'duplicate-id', name: 'User 1' });
      await db.create('users', { id: 'duplicate-id', name: 'User 2' });
      
      await db.remove('users', 'duplicate-id');
      
      const result = await db.find('users', { id: 'duplicate-id' });
      expect(result).toEqual([]);
    });
  });

  describe('File Operations', () => {
    test('should create database file on first operation', async () => {
      const dbPath = path.join(testConfig.filepath, testConfig.database);
      
      // Ensure file doesn't exist initially
      expect(await fs.pathExists(dbPath)).toBe(false);
      
      // Perform operation
      await db.create('users', { name: 'Test User' });
      
      // Check file was created
      expect(await fs.pathExists(dbPath)).toBe(true);
    });

    test('should handle corrupted database file', async () => {
      const dbPath = path.join(testConfig.filepath, testConfig.database);
      
      // Create corrupted JSON file
      await fs.writeFile(dbPath, '{"users": [{"invalid": json}]');
      
      // Should handle gracefully
      const result = await db.find('users');
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle empty database file', async () => {
      const dbPath = path.join(testConfig.filepath, testConfig.database);
      
      // Create empty file
      await fs.writeFile(dbPath, '');
      
      // Should handle gracefully
      const result = await db.find('users');
      expect(result).toBeNull();
    });

    test('should handle non-existent database file', async () => {
      const dbPath = path.join(testConfig.filepath, testConfig.database);
      
      // Ensure file doesn't exist
      await fs.remove(dbPath);
      
      // Should create file and work normally
      const result = await db.create('users', { name: 'Test User' });
      expect(result).toBeDefined();
      expect(await fs.pathExists(dbPath)).toBe(true);
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
      // All updates should succeed, but final state depends on timing
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large objects', async () => {
      const largeObject = {
        name: 'Large User',
        data: 'x'.repeat(10000), // 10KB string
        array: Array(1000).fill(0).map((_, i) => ({ index: i, value: `item-${i}` }))
      };
      
      const result = await db.create('users', largeObject);
      expect(result).toBeDefined();
      expect(result.data.length).toBe(10000);
      expect(result.array.length).toBe(1000);
    });

    test('should handle special characters in field names', async () => {
      const testData = {
        'field-with-dashes': 'value1',
        'field_with_underscores': 'value2',
        'field.with.dots': 'value3',
        'field with spaces': 'value4',
        'field123': 'value5'
      };
      
      const result = await db.create('users', testData);
      expect(result).toBeDefined();
      expect(result['field-with-dashes']).toBe('value1');
      expect(result['field_with_underscores']).toBe('value2');
      expect(result['field.with.dots']).toBe('value3');
      expect(result['field with spaces']).toBe('value4');
      expect(result['field123']).toBe('value5');
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

    test('should handle deeply nested objects', async () => {
      const testData = {
        name: 'Test User',
        profile: {
          personal: {
            address: {
              street: '123 Main St',
              city: 'Anytown',
              coordinates: {
                lat: 40.7128,
                lng: -74.0060
              }
            }
          }
        }
      };
      
      const result = await db.create('users', testData);
      expect(result).toBeDefined();
      expect(result.profile.personal.address.street).toBe('123 Main St');
      expect(result.profile.personal.address.coordinates.lat).toBe(40.7128);
    });

    test('should handle arrays with mixed types', async () => {
      const testData = {
        name: 'Test User',
        mixedArray: [
          'string',
          123,
          true,
          null,
          { nested: 'object' },
          ['nested', 'array']
        ]
      };
      
      const result = await db.create('users', testData);
      expect(result).toBeDefined();
      expect(Array.isArray(result.mixedArray)).toBe(true);
      expect(result.mixedArray.length).toBe(6);
      expect(result.mixedArray[0]).toBe('string');
      expect(result.mixedArray[1]).toBe(123);
      expect(result.mixedArray[2]).toBe(true);
      expect(result.mixedArray[3]).toBeNull();
      expect(result.mixedArray[4].nested).toBe('object');
      expect(Array.isArray(result.mixedArray[5])).toBe(true);
    });
  });

  describe('API Consistency', () => {
    test('should provide all required methods', () => {
      const requiredMethods = [
        'get', 'find', 'findFirst', 'findLast', 'findOne',
        'create', 'update', 'set', 'remove'
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

    test('should handle findFirst alias correctly', async () => {
      await db.create('users', { name: 'First User' });
      await db.create('users', { name: 'Second User' });
      
      const result1 = await db.findFirst('users');
      const result2 = await db.findOne('users');
      
      expect(result1).toEqual(result2);
    });
  });
});
