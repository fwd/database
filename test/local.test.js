const database = require('../index');
const fs = require('fs-extra');
const path = require('path');

describe('Local Plugin Tests', () => {
  let db;
  const testConfig = {
    path: './test-data/local',
    namespace: 'test-namespace'
  };

  beforeEach(async () => {
    db = database('local', testConfig);
    await fs.ensureDir(testConfig.path);
  });

  afterEach(async () => {
    await fs.remove('./test-data/local');
  });

  describe('Configuration and Initialization', () => {
    test('should initialize with default configuration', () => {
      const defaultDb = database('local');
      expect(defaultDb).toBeDefined();
    });

    test('should initialize with custom configuration', () => {
      const customConfig = {
        path: './custom-path',
        namespace: 'custom-namespace',
        default_key: 'custom_default',
        created_key: 'custom_created',
        updated_key: 'custom_updated'
      };
      const customDb = database('local', customConfig);
      expect(customDb).toBeDefined();
    });

    test('should create directory structure on first use', async () => {
      const newDb = database('local', { path: './test-data/new-local', namespace: 'new-test' });
      await newDb.create('test-model', { name: 'test' });
      
      const exists = await fs.pathExists('./test-data/new-local/new-test/test-model');
      expect(exists).toBe(true);
      
      await fs.remove('./test-data/new-local');
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
    });

    test('should create multiple records', async () => {
      const testData = createTestData().users;
      const result = await db.create('users', testData);
      
      expect(result).toBeDefined();
      expect(result.total).toBe(testData.length);
      expect(result.sample).toBeDefined();
      expect(Array.isArray(result.sample)).toBe(true);
    });

    test('should create record with custom ID', async () => {
      const testData = { id: 'custom-id', name: 'Test User' };
      const result = await db.create('users', testData);
      
      expect(result.id).toBe('custom-id');
      expect(result.name).toBe('Test User');
    });

    test('should create empty record when no data provided', async () => {
      const result = await db.create('users', {});
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeDefined();
    });

    test('should reject creation on invalid path', async () => {
      const invalidDb = database('local', { path: '../../../invalid', namespace: 'test' });
      
      try {
        await invalidDb.create('users', { name: 'test' });
        // If it doesn't throw, it should return an error
        expect(true).toBe(false); // This should not be reached
      } catch (error) {
        expect(error).toBeDefined();
        // Either permission error or invalid path error
        expect(error.message).toMatch(/permission denied|Invalid path/);
      }
    }, 10000);

    test('should reject creation when model is not an array', async () => {
      // First create a default key file to simulate non-array model
      const modelPath = path.join(testConfig.path, testConfig.namespace, 'users', '_default');
      await fs.ensureDir(path.dirname(modelPath));
      await fs.writeFile(modelPath, '{"single": "object"}');
      
      await expect(db.create('users', { name: 'test' }))
        .rejects.toEqual({ error: true, message: "users is not an Array." });
    });
  });

  describe('Read Operations', () => {
    beforeEach(async () => {
      // Create test data
      await db.create('users', createTestData().users);
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

    test('should return empty array for non-existent model', async () => {
      const results = await db.find('non-existent');
      expect(results).toEqual([]);
    });

    test('should handle pagination', async () => {
      const result = await db.paginate('users', { page: 1, limit: 2 });
      
      expect(result).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.total).toBe(3);
      expect(result.data.length).toBe(2);
      expect(result.pages).toBeDefined();
    });

    test('should handle query with pagination parameters', async () => {
      const result = await db.find('users', { page: 1, limit: 2 });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3); // Should ignore pagination params in find
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
      expect(result.email).toBe('original@example.com'); // Should preserve existing fields
      expect(result.updated_at).toBeDefined();
    });

    test('should update record with empty update object', async () => {
      const result = await db.update('users', userId, {});
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Original Name');
      expect(result.updated_at).toBeDefined();
    });

    test('should reject update on non-existent record', async () => {
      await expect(db.update('users', 'non-existent-id', { name: 'Updated' }))
        .rejects.toEqual({ error: true, message: "Not found" });
    });

    test('should reject update on invalid path', async () => {
      const invalidDb = database('local', { path: '../../../invalid', namespace: 'test' });
      
      try {
        await invalidDb.update('users', userId, { name: 'Updated' });
        expect(true).toBe(false); // This should not be reached
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/permission denied|Invalid path/);
      }
    }, 10000);
  });

  describe('Delete Operations', () => {
    let userId;

    beforeEach(async () => {
      const user = await db.create('users', { name: 'To Delete' });
      userId = user.id;
    });

    test('should delete existing record', async () => {
      await expect(db.delete('users', userId)).resolves.toBeUndefined();
      
      const result = await db.find('users', { id: userId });
      expect(result).toEqual([]);
    });

    test('should delete using remove alias', async () => {
      await expect(db.remove('users', userId)).resolves.toBeUndefined();
      
      const result = await db.find('users', { id: userId });
      expect(result).toEqual([]);
    });

    test('should reject delete on non-existent record', async () => {
      await expect(db.delete('users', 'non-existent-id'))
        .rejects.toEqual({ error: true, message: "Not found." });
    });

    test('should reject delete on invalid path', async () => {
      const invalidDb = database('local', { path: '../../../invalid', namespace: 'test' });
      
      try {
        await invalidDb.delete('users', userId);
        expect(true).toBe(false); // This should not be reached
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/permission denied|Invalid path/);
      }
    }, 10000);
  });

  describe('Set Operations', () => {
    test('should set complete object', async () => {
      const testData = { id: 'test-id', name: 'Test User', age: 25 };
      const result = await db.set('users', testData);
      
      expect(result).toBeDefined();
    });

    test('should set array data', async () => {
      const testData = [{ name: 'User 1' }, { name: 'User 2' }];
      const result = await db.set('users', testData);
      
      expect(result).toBeDefined();
    });

    test('should remove default key file when setting empty array', async () => {
      // First set some data
      await db.set('users', [{ name: 'Test' }]);
      
      // Then set empty array
      await db.set('users', []);
      
      // Wait a bit for file deletion to complete
      await waitFor(10);
      
      // Check that the default key file was removed
      const defaultPath = path.join(testConfig.path, testConfig.namespace, 'users', '_default');
      const exists = await fs.pathExists(defaultPath);
      expect(exists).toBe(false);
    });

    test('should handle non-JSON serializable data', async () => {
      const testData = { id: 'test-id', circular: {} };
      testData.circular.self = testData; // Create circular reference
      
      const result = await db.set('users', testData);
      expect(result).toBeDefined();
    });

    test('should reject set on invalid path', async () => {
      const invalidDb = database('local', { path: '../../../invalid', namespace: 'test' });
      
      try {
        await invalidDb.set('users', { name: 'test' });
        expect(true).toBe(false); // This should not be reached
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/permission denied|Invalid path/);
      }
    }, 10000);
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await db.create('users', [
        { name: 'Alice', country: 'US', age: 25 },
        { name: 'Bob', country: 'CA', age: 30 },
        { name: 'Charlie', country: 'US', age: 35 }
      ]);
    });

    test('should execute JSON query', async () => {
      const result = await db.query('users', '[country=US].name');
      
      expect(result).toBeDefined();
      expect(result.value).toBeDefined();
    });

    test('should execute query with locals', async () => {
      const locals = { minAge: 30 };
      const result = await db.query('users', '[age>=minAge]', locals);
      
      expect(result).toBeDefined();
    });

    test('should handle query without query string', async () => {
      const result = await db.query('users');
      
      expect(result).toBeDefined();
    });
  });

  describe('List Operations', () => {
    beforeEach(async () => {
      await db.create('users', createTestData().users);
      await db.create('products', createTestData().product);
    });

    test('should list all models', async () => {
      const result = await db.list('users');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    test('should reject list on non-existent model', async () => {
      await expect(db.list('non-existent'))
        .rejects.toEqual({
          code: 404,
          error: true
        });
    });

    test('should reject list on invalid path', async () => {
      const invalidDb = database('local', { path: '../../../invalid', namespace: 'test' });
      
      try {
        await invalidDb.list('users');
        expect(true).toBe(false); // This should not be reached
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/permission denied|Invalid path/);
      }
    }, 10000);
  });

  describe('Pluck Operations', () => {
    let userId;

    beforeEach(async () => {
      const user = await db.create('users', { name: 'Test User', email: 'test@example.com', age: 25 });
      userId = user.id;
    });

    test('should pluck specific key from record', async () => {
      const result = await db.pluck('users', userId, 'age');
      
      expect(result).toBeDefined();
      expect(result.age).toBeUndefined();
      expect(result.name).toBe('Test User');
      expect(result.email).toBe('test@example.com');
    });

    test('should reject pluck on non-existent record', async () => {
      await expect(db.pluck('users', 'non-existent-id', 'age'))
        .rejects.toEqual({ error: true, message: "Not found" });
    });

    test('should reject pluck on invalid path', async () => {
      const invalidDb = database('local', { path: '../../../invalid', namespace: 'test' });
      
      try {
        await invalidDb.pluck('users', userId, 'age');
        expect(true).toBe(false); // This should not be reached
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/permission denied|Invalid path/);
      }
    }, 10000);
  });

  describe('File Handling', () => {
    test('should handle corrupted JSON files gracefully', async () => {
      // Create a corrupted JSON file
      const modelPath = path.join(testConfig.path, testConfig.namespace, 'users');
      await fs.ensureDir(modelPath);
      await fs.writeFile(path.join(modelPath, 'corrupted.json'), '{"invalid": json}');
      
      const result = await db.find('users');
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle non-JSON files', async () => {
      // Create a non-JSON file
      const modelPath = path.join(testConfig.path, testConfig.namespace, 'users');
      await fs.ensureDir(modelPath);
      await fs.writeFile(path.join(modelPath, 'text.txt'), 'This is plain text');
      
      const result = await db.find('users');
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle single file models', async () => {
      // Create a single file model
      const modelPath = path.join(testConfig.path, testConfig.namespace, 'config');
      await fs.ensureDir(modelPath);
      await fs.writeFile(path.join(modelPath, 'config.json'), '{"setting": "value"}');
      
      const result = await db.find('config');
      expect(result).toBeDefined();
    });
  });

  describe('Concurrency and Threading', () => {
    test('should handle concurrent writes', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(db.create('users', { name: `User ${i}`, index: i }));
      }
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(10);
      results.forEach((result, index) => {
        expect(result.name).toBe(`User ${index}`);
        expect(result.index).toBe(index);
      });
    });

    test('should handle concurrent reads', async () => {
      // Create some test data
      await db.create('users', createTestData().users);
      
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(db.find('users'));
      }
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(3);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long field names', async () => {
      const longFieldName = 'a'.repeat(1000);
      const testData = { [longFieldName]: 'test value' };
      
      const result = await db.create('users', testData);
      expect(result).toBeDefined();
      expect(result[longFieldName]).toBe('test value');
    });

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
  });
});
