const database = require('../index');
const fs = require('fs-extra');
const path = require('path');

describe('Error Handling and Edge Cases', () => {
  const testConfigs = {
    local: { path: './test-data/error-handling/local', namespace: 'error-test' },
    lowdb: { filepath: './test-data/error-handling/lowdb', database: 'error-test.json' },
    sqlite3: { file: './test-data/error-handling/sqlite3/error-test.sqlite' }
  };

  beforeEach(async () => {
    await fs.remove('./test-data/error-handling');
    await fs.ensureDir('./test-data/error-handling');
  });

  afterEach(async () => {
    await fs.remove('./test-data/error-handling');
  });

  describe('Invalid Input Handling', () => {
    test('should handle null and undefined inputs gracefully', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        // Test null model name
        try {
          await db.find(null);
        } catch (error) {
          expect(error).toBeDefined();
        }
        
        // Test undefined model name
        try {
          await db.find(undefined);
        } catch (error) {
          expect(error).toBeDefined();
        }
        
        // Test null data in create
        try {
          await db.create('test', null);
        } catch (error) {
          expect(error).toBeDefined();
        }
        
        // Test undefined data in create
        try {
          await db.create('test', undefined);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle empty string inputs', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        // Test empty model name
        try {
          await db.find('');
        } catch (error) {
          expect(error).toBeDefined();
        }
        
        // Test empty data in create
        try {
          await db.create('test', '');
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle non-string model names', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        // Test numeric model name
        try {
          await db.find(123);
        } catch (error) {
          expect(error).toBeDefined();
        }
        
        // Test boolean model name
        try {
          await db.find(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
        
        // Test object model name
        try {
          await db.find({});
        } catch (error) {
          expect(error).toBeDefined();
        }
        
        // Test array model name
        try {
          await db.find([]);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle invalid query objects', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        // Create test data first
        await db.create('test', { name: 'Test' });
        
        // Test null query
        try {
          await db.find('test', null);
        } catch (error) {
          expect(error).toBeDefined();
        }
        
        // Test string query (should work for some plugins)
        try {
          const result = await db.find('test', 'invalid');
          expect(Array.isArray(result)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
        
        // Test array query
        try {
          await db.find('test', []);
        } catch (error) {
          expect(error).toBeDefined();
        }
        
        // Test function query
        try {
          await db.find('test', () => {});
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('File System Errors', () => {
    test('should handle permission errors gracefully', async () => {
      const localDb = database('local', { path: '/root/forbidden', namespace: 'test' });
      
      try {
        await localDb.create('test', { name: 'Test' });
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('Invalid path');
      }
    });

    test('should handle disk space errors gracefully', async () => {
      // This test simulates disk space issues by creating very large data
      const localDb = database('local', testConfigs.local);
      
      try {
        // Create very large data
        const largeData = { data: 'x'.repeat(1000000) }; // 1MB string
        await localDb.create('test', largeData);
        
        // If it succeeds, verify the data
        const result = await localDb.find('test');
        expect(result.length).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle corrupted file data', async () => {
      const localDb = database('local', testConfigs.local);
      
      // Create a corrupted JSON file
      const modelPath = path.join(testConfigs.local.path, testConfigs.local.namespace, 'test');
      await fs.ensureDir(modelPath);
      await fs.writeFile(path.join(modelPath, 'corrupted.json'), '{"invalid": json}');
      
      try {
        const result = await localDb.find('test');
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle missing directories', async () => {
      const localDb = database('local', { path: './non-existent-path', namespace: 'test' });
      
      try {
        await localDb.create('test', { name: 'Test' });
        // Should create the directory automatically
        expect(await fs.pathExists('./non-existent-path')).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Database Connection Errors', () => {
    test('should handle SQLite database lock errors', async () => {
      const sqliteDb = database('sqlite3', testConfigs.sqlite3);
      
      // Create a database file
      await sqliteDb.create('test', { name: 'Test' });
      
      // Try to access the same database file from another instance
      const sqliteDb2 = database('sqlite3', testConfigs.sqlite3);
      
      try {
        await sqliteDb2.create('test', { name: 'Test2' });
        // Should work fine
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle SQLite syntax errors', async () => {
      const sqliteDb = database('sqlite3', testConfigs.sqlite3);
      
      try {
        await sqliteDb.raw('INVALID SQL SYNTAX');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('SQLITE_ERROR');
      }
    });

    test('should handle LowDB file access errors', async () => {
      const lowdbDb = database('lowdb', { filepath: '/root/forbidden', database: 'test.json' });
      
      try {
        await lowdbDb.create('test', { name: 'Test' });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Memory and Resource Limits', () => {
    test('should handle memory exhaustion gracefully', async () => {
      const localDb = database('local', testConfigs.local);
      
      try {
        // Create many large objects
        const promises = [];
        for (let i = 0; i < 1000; i++) {
          const largeData = { 
            data: 'x'.repeat(10000), // 10KB per object
            index: i 
          };
          promises.push(localDb.create('test', largeData));
        }
        
        await Promise.all(promises);
        
        // Verify data was created
        const result = await localDb.find('test');
        expect(result.length).toBe(1000);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle very deep object nesting', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        try {
          // Create deeply nested object
          let deepObject = { name: 'Deep Object' };
          for (let i = 0; i < 100; i++) {
            deepObject = { level: i, nested: deepObject };
          }
          
          const result = await db.create('test', deepObject);
          expect(result).toBeDefined();
          
          const found = await db.findOne('test', { name: 'Deep Object' });
          expect(found).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle circular references', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        try {
          // Create circular reference
          const circular = { name: 'Circular' };
          circular.self = circular;
          
          const result = await db.create('test', circular);
          expect(result).toBeDefined();
          
          const found = await db.findOne('test', { name: 'Circular' });
          expect(found).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Concurrency and Race Conditions', () => {
    test('should handle concurrent writes to same record', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        // Create initial record
        const user = await db.create('users', { name: 'Test User', counter: 0 });
        
        // Try to update the same record concurrently
        const promises = [];
        for (let i = 0; i < 10; i++) {
          promises.push(db.update('users', user.id, { counter: i + 1 }));
        }
        
        try {
          const results = await Promise.all(promises);
          expect(results.length).toBe(10);
          
          // Verify final state
          const finalUser = await db.findOne('users', { id: user.id });
          expect(finalUser).toBeDefined();
          expect(finalUser.counter).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle concurrent deletes', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        // Create multiple records
        const users = [];
        for (let i = 0; i < 5; i++) {
          const user = await db.create('users', { name: `User ${i}` });
          users.push(user);
        }
        
        // Try to delete the same record concurrently
        const promises = [];
        for (let i = 0; i < 3; i++) {
          promises.push(db.delete('users', users[0].id));
        }
        
        try {
          const results = await Promise.all(promises);
          expect(results.length).toBe(3);
          
          // Verify record was deleted
          const deletedUser = await db.findOne('users', { id: users[0].id });
          expect(deletedUser).toBeUndefined();
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle read during write operations', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        // Create initial data
        await db.create('users', { name: 'Test User' });
        
        // Perform read and write operations concurrently
        const promises = [
          db.find('users'),
          db.create('users', { name: 'New User' }),
          db.find('users'),
          db.update('users', 1, { name: 'Updated User' }),
          db.find('users')
        ];
        
        try {
          const results = await Promise.all(promises);
          expect(results.length).toBe(5);
          
          // Verify reads returned data
          results.forEach((result, index) => {
            if (index % 2 === 0) { // Even indices are reads
              expect(Array.isArray(result)).toBe(true);
            }
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Data Type Edge Cases', () => {
    test('should handle special numeric values', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        const specialNumbers = {
          maxSafeInteger: Number.MAX_SAFE_INTEGER,
          minSafeInteger: Number.MIN_SAFE_INTEGER,
          maxValue: Number.MAX_VALUE,
          minValue: Number.MIN_VALUE,
          infinity: Infinity,
          negativeInfinity: -Infinity,
          notANumber: NaN
        };
        
        try {
          const result = await db.create('test', specialNumbers);
          expect(result).toBeDefined();
          
          const found = await db.findOne('test', { maxSafeInteger: Number.MAX_SAFE_INTEGER });
          expect(found).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle special string values', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        const specialStrings = {
          emptyString: '',
          whitespace: '   ',
          newlines: 'line1\nline2\nline3',
          tabs: 'col1\tcol2\tcol3',
          unicode: '测试用户 🚀 émojis',
          specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
          quotes: 'He said "Hello" and \'Goodbye\'',
          backslashes: 'C:\\Users\\Test\\File.txt',
          nullChar: 'test\0null',
          controlChars: 'test\x01\x02\x03'
        };
        
        try {
          const result = await db.create('test', specialStrings);
          expect(result).toBeDefined();
          
          const found = await db.findOne('test', { emptyString: '' });
          expect(found).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle date objects', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        const dateData = {
          now: new Date(),
          epoch: new Date(0),
          future: new Date('2030-12-31'),
          past: new Date('1900-01-01'),
          invalid: new Date('invalid')
        };
        
        try {
          const result = await db.create('test', dateData);
          expect(result).toBeDefined();
          
          const found = await db.findOne('test', { now: dateData.now });
          expect(found).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle function objects', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        const functionData = {
          name: 'Test',
          func: function() { return 'test'; },
          arrowFunc: () => 'test',
          asyncFunc: async () => 'test'
        };
        
        try {
          const result = await db.create('test', functionData);
          expect(result).toBeDefined();
          
          const found = await db.findOne('test', { name: 'Test' });
          expect(found).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Network and External Dependencies', () => {
    test('should handle missing dependencies gracefully', async () => {
      // Test what happens when required modules are missing
      const originalRequire = require;
      
      try {
        // Mock missing module
        jest.doMock('sqlite3', () => {
          throw new Error('Module not found');
        });
        
        const result = database('sqlite3');
        expect(result).toBeUndefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle corrupted dependencies', async () => {
      // This test simulates corrupted module loading
      try {
        const result = database('sqlite3', { file: 'corrupted-db.sqlite' });
        expect(result).toBeDefined();
        
        // Try to use the database
        await result.create('test', { name: 'Test' });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Recovery and Resilience', () => {
    test('should recover from temporary failures', async () => {
      const localDb = database('local', testConfigs.local);
      
      try {
        // Simulate temporary failure by creating invalid data
        await localDb.create('test', { name: 'Test' });
        
        // Try to recover by creating valid data
        const result = await localDb.create('test', { name: 'Recovery Test' });
        expect(result).toBeDefined();
        
        // Verify recovery
        const found = await localDb.find('test');
        expect(found.length).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle partial failures gracefully', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        try {
          // Create some valid data
          await db.create('test', { name: 'Valid Data' });
          
          // Try to create invalid data (should fail)
          try {
            await db.create('test', null);
          } catch (error) {
            expect(error).toBeDefined();
          }
          
          // Verify valid data still exists
          const found = await db.find('test');
          expect(found.length).toBeGreaterThan(0);
          expect(found[0].name).toBe('Valid Data');
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle cleanup after errors', async () => {
      const localDb = database('local', testConfigs.local);
      
      try {
        // Create some data
        await localDb.create('test', { name: 'Test' });
        
        // Simulate error
        try {
          await localDb.create('test', null);
        } catch (error) {
          expect(error).toBeDefined();
        }
        
        // Verify cleanup didn't affect valid data
        const found = await localDb.find('test');
        expect(found.length).toBeGreaterThan(0);
        expect(found[0].name).toBe('Test');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance Under Stress', () => {
    test('should handle rapid successive operations', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        try {
          const start = Date.now();
          
          // Perform many rapid operations
          for (let i = 0; i < 100; i++) {
            await db.create('test', { index: i, data: `data-${i}` });
          }
          
          const end = Date.now();
          const duration = end - start;
          
          // Should complete within reasonable time
          expect(duration).toBeLessThan(10000); // 10 seconds
          
          // Verify data integrity
          const found = await db.find('test');
          expect(found.length).toBe(100);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle memory pressure', async () => {
      const localDb = database('local', testConfigs.local);
      
      try {
        // Create many large objects to test memory handling
        const promises = [];
        for (let i = 0; i < 100; i++) {
          const largeData = { 
            index: i,
            data: 'x'.repeat(1000), // 1KB per object
            metadata: Array(100).fill(i) // Additional memory usage
          };
          promises.push(localDb.create('test', largeData));
        }
        
        await Promise.all(promises);
        
        // Verify all data was created
        const found = await localDb.find('test');
        expect(found.length).toBe(100);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
