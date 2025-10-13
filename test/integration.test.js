const database = require('../index');
const fs = require('fs-extra');
const path = require('path');

describe('Integration Tests', () => {
  const testConfigs = {
    local: { path: './test-data/integration/local', namespace: 'integration-test' },
    lowdb: { filepath: './test-data/integration/lowdb', database: 'integration-test.json' },
    sqlite3: { file: './test-data/integration/sqlite3/integration-test.sqlite' }
  };

  beforeEach(async () => {
    // Clean up test directories
    await fs.remove('./test-data/integration');
    await fs.ensureDir('./test-data/integration');
  });

  afterEach(async () => {
    await fs.remove('./test-data/integration');
  });

  describe('Cross-Plugin API Consistency', () => {
    test('should provide consistent API across all plugins', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      const results = {};

      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        // Test create
        const user = await db.create('users', { name: 'Test User', email: 'test@example.com' });
        expect(user).toBeDefined();
        expect(user.name).toBe('Test User');
        
        // Test find
        const foundUsers = await db.find('users');
        expect(Array.isArray(foundUsers)).toBe(true);
        expect(foundUsers.length).toBeGreaterThan(0);
        
        // Test findOne
        const foundUser = await db.findOne('users', { name: 'Test User' });
        expect(foundUser).toBeDefined();
        expect(foundUser.name).toBe('Test User');
        
        // Test update
        const updatedUser = await db.update('users', user.id, { age: 25 });
        expect(updatedUser).toBeDefined();
        
        // Test delete
        await expect(db.delete('users', user.id)).resolves.toBeDefined();
        
        results[plugin] = { success: true };
      }

      expect(Object.keys(results)).toHaveLength(3);
      Object.values(results).forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('should handle same data across different plugins', async () => {
      const testData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        active: true,
        metadata: { role: 'admin', permissions: ['read', 'write'] },
        tags: ['user', 'admin', 'premium']
      };

      const plugins = ['local', 'lowdb', 'sqlite3'];
      const results = {};

      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        const created = await db.create('users', testData);
        expect(created).toBeDefined();
        expect(created.name).toBe(testData.name);
        expect(created.email).toBe(testData.email);
        expect(created.age).toBe(testData.age);
        expect(created.active).toBe(testData.active);
        
        const found = await db.findOne('users', { name: 'John Doe' });
        expect(found).toBeDefined();
        expect(found.name).toBe(testData.name);
        expect(found.email).toBe(testData.email);
        expect(found.age).toBe(testData.age);
        expect(found.active).toBe(testData.active);
        
        results[plugin] = { created, found };
      }

      // Verify all plugins handled the data consistently
      Object.values(results).forEach(result => {
        expect(result.created.name).toBe(testData.name);
        expect(result.found.name).toBe(testData.name);
      });
    });
  });

  describe('Data Migration Between Plugins', () => {
    test('should migrate data from local to lowdb', async () => {
      const localDb = database('local', testConfigs.local);
      const lowdbDb = database('lowdb', testConfigs.lowdb);

      // Create data in local
      const users = [
        { name: 'Alice', email: 'alice@example.com', age: 25 },
        { name: 'Bob', email: 'bob@example.com', age: 30 },
        { name: 'Charlie', email: 'charlie@example.com', age: 35 }
      ];

      for (const user of users) {
        await localDb.create('users', user);
      }

      // Read from local
      const localUsers = await localDb.find('users');
      expect(localUsers.length).toBe(3);

      // Migrate to lowdb
      for (const user of localUsers) {
        await lowdbDb.create('users', user);
      }

      // Verify in lowdb
      const lowdbUsers = await lowdbDb.find('users');
      expect(lowdbUsers.length).toBe(3);

      // Verify data integrity
      localUsers.forEach((localUser, index) => {
        const lowdbUser = lowdbUsers.find(u => u.name === localUser.name);
        expect(lowdbUser).toBeDefined();
        expect(lowdbUser.name).toBe(localUser.name);
        expect(lowdbUser.email).toBe(localUser.email);
        expect(lowdbUser.age).toBe(localUser.age);
      });
    });

    test('should migrate data from lowdb to sqlite3', async () => {
      const lowdbDb = database('lowdb', testConfigs.lowdb);
      const sqliteDb = database('sqlite3', testConfigs.sqlite3);

      // Create data in lowdb
      const products = [
        { name: 'Product 1', price: 99.99, category: 'electronics' },
        { name: 'Product 2', price: 149.99, category: 'clothing' },
        { name: 'Product 3', price: 199.99, category: 'electronics' }
      ];

      for (const product of products) {
        await lowdbDb.create('products', product);
      }

      // Read from lowdb
      const lowdbProducts = await lowdbDb.find('products');
      expect(lowdbProducts.length).toBe(3);

      // Migrate to sqlite3
      for (const product of lowdbProducts) {
        await sqliteDb.create('products', product);
      }

      // Verify in sqlite3
      const sqliteProducts = await sqliteDb.find('products');
      expect(sqliteProducts.length).toBe(3);

      // Verify data integrity
      lowdbProducts.forEach((lowdbProduct, index) => {
        const sqliteProduct = sqliteProducts.find(p => p.name === lowdbProduct.name);
        expect(sqliteProduct).toBeDefined();
        expect(sqliteProduct.name).toBe(lowdbProduct.name);
        expect(sqliteProduct.price).toBe(lowdbProduct.price);
        expect(sqliteProduct.category).toBe(lowdbProduct.category);
      });
    });

    test('should migrate data from sqlite3 to local', async () => {
      const sqliteDb = database('sqlite3', testConfigs.sqlite3);
      const localDb = database('local', testConfigs.local);

      // Create data in sqlite3
      const orders = [
        { customer: 'Customer 1', total: 299.99, status: 'completed' },
        { customer: 'Customer 2', total: 199.99, status: 'pending' },
        { customer: 'Customer 3', total: 399.99, status: 'completed' }
      ];

      for (const order of orders) {
        await sqliteDb.create('orders', order);
      }

      // Read from sqlite3
      const sqliteOrders = await sqliteDb.find('orders');
      expect(sqliteOrders.length).toBe(3);

      // Migrate to local
      for (const order of sqliteOrders) {
        await localDb.create('orders', order);
      }

      // Verify in local
      const localOrders = await localDb.find('orders');
      expect(localOrders.length).toBe(3);

      // Verify data integrity
      sqliteOrders.forEach((sqliteOrder, index) => {
        const localOrder = localOrders.find(o => o.customer === sqliteOrder.customer);
        expect(localOrder).toBeDefined();
        expect(localOrder.customer).toBe(sqliteOrder.customer);
        expect(localOrder.total).toBe(sqliteOrder.total);
        expect(localOrder.status).toBe(sqliteOrder.status);
      });
    });
  });

  describe('Concurrent Operations Across Plugins', () => {
    test('should handle concurrent operations on different plugins', async () => {
      const localDb = database('local', testConfigs.local);
      const lowdbDb = database('lowdb', testConfigs.lowdb);
      const sqliteDb = database('sqlite3', testConfigs.sqlite3);

      const operations = [
        () => localDb.create('users', { name: 'Local User', plugin: 'local' }),
        () => lowdbDb.create('users', { name: 'LowDB User', plugin: 'lowdb' }),
        () => sqliteDb.create('users', { name: 'SQLite User', plugin: 'sqlite3' })
      ];

      const results = await Promise.all(operations.map(op => op()));

      expect(results.length).toBe(3);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.name).toBeDefined();
        expect(result.plugin).toBeDefined();
      });

      // Verify each plugin has its own data
      const localUsers = await localDb.find('users');
      const lowdbUsers = await lowdbDb.find('users');
      const sqliteUsers = await sqliteDb.find('users');

      expect(localUsers.length).toBe(1);
      expect(lowdbUsers.length).toBe(1);
      expect(sqliteUsers.length).toBe(1);

      expect(localUsers[0].plugin).toBe('local');
      expect(lowdbUsers[0].plugin).toBe('lowdb');
      expect(sqliteUsers[0].plugin).toBe('sqlite3');
    });

    test('should handle mixed read/write operations', async () => {
      const localDb = database('local', testConfigs.local);
      const lowdbDb = database('lowdb', testConfigs.lowdb);

      // Create initial data
      await localDb.create('products', { name: 'Product 1', price: 99.99 });
      await lowdbDb.create('products', { name: 'Product 2', price: 149.99 });

      const operations = [
        () => localDb.find('products'),
        () => lowdbDb.find('products'),
        () => localDb.create('products', { name: 'Product 3', price: 199.99 }),
        () => lowdbDb.create('products', { name: 'Product 4', price: 249.99 }),
        () => localDb.findOne('products', { name: 'Product 1' }),
        () => lowdbDb.findOne('products', { name: 'Product 2' })
      ];

      const results = await Promise.all(operations.map(op => op()));

      expect(results.length).toBe(6);
      
      // Verify reads returned data
      expect(Array.isArray(results[0])).toBe(true); // localDb.find
      expect(Array.isArray(results[1])).toBe(true); // lowdbDb.find
      expect(results[0].length).toBeGreaterThan(0);
      expect(results[1].length).toBeGreaterThan(0);
      
      // Verify creates succeeded
      expect(results[2]).toBeDefined(); // localDb.create
      expect(results[3]).toBeDefined(); // lowdbDb.create
      
      // Verify findOne operations
      expect(results[4]).toBeDefined(); // localDb.findOne
      expect(results[5]).toBeDefined(); // lowdbDb.findOne
    });
  });

  describe('Error Handling Across Plugins', () => {
    test('should handle errors consistently across plugins', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      const results = {};

      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        try {
          // Try to find non-existent data
          const result = await db.find('non-existent');
          results[plugin] = { success: true, result };
        } catch (error) {
          results[plugin] = { success: false, error: error.message };
        }
      }

      // All plugins should handle non-existent collections gracefully
      Object.values(results).forEach(result => {
        expect(result.success).toBe(true);
        expect(Array.isArray(result.result)).toBe(true);
        expect(result.result.length).toBe(0);
      });
    });

    test('should handle invalid operations consistently', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      const results = {};

      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        try {
          // Try to update non-existent record
          await db.update('users', 'non-existent-id', { name: 'Updated' });
          results[plugin] = { success: true };
        } catch (error) {
          results[plugin] = { success: false, error: error.message };
        }
      }

      // All plugins should handle non-existent updates gracefully
      Object.values(results).forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Performance Comparison', () => {
    test('should handle bulk operations efficiently across plugins', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      const results = {};

      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        const start = Date.now();

        // Create many records
        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(db.create('users', { name: `User ${i}`, index: i }));
        }
        await Promise.all(promises);

        // Read all records
        const users = await db.find('users');
        expect(users.length).toBe(100);

        const end = Date.now();
        results[plugin] = { duration: end - start, count: users.length };
      }

      // All plugins should complete within reasonable time
      Object.values(results).forEach(result => {
        expect(result.duration).toBeLessThan(5000); // Less than 5 seconds
        expect(result.count).toBe(100);
      });
    });

    test('should handle concurrent reads efficiently', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      const results = {};

      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        // Create test data
        await db.create('users', { name: 'Test User' });

        const start = Date.now();

        // Perform many concurrent reads
        const promises = [];
        for (let i = 0; i < 50; i++) {
          promises.push(db.find('users'));
        }
        await Promise.all(promises);

        const end = Date.now();
        results[plugin] = { duration: end - start };
      }

      // All plugins should handle concurrent reads efficiently
      Object.values(results).forEach(result => {
        expect(result.duration).toBeLessThan(2000); // Less than 2 seconds
      });
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data consistency across operations', async () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      const results = {};

      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        // Create initial data
        const user = await db.create('users', { name: 'John Doe', email: 'john@example.com' });
        expect(user).toBeDefined();
        expect(user.name).toBe('John Doe');

        // Update the user
        const updated = await db.update('users', user.id, { age: 30 });
        expect(updated).toBeDefined();

        // Verify the update
        const found = await db.findOne('users', { id: user.id });
        expect(found).toBeDefined();
        expect(found.name).toBe('John Doe');
        expect(found.email).toBe('john@example.com');
        expect(found.age).toBe(30);

        // Delete the user
        await db.delete('users', user.id);

        // Verify deletion
        const deleted = await db.findOne('users', { id: user.id });
        expect(deleted).toBeUndefined();

        results[plugin] = { success: true };
      }

      // All plugins should maintain data consistency
      Object.values(results).forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('should handle complex data structures consistently', async () => {
      const complexData = {
        name: 'Complex User',
        profile: {
          personal: {
            firstName: 'John',
            lastName: 'Doe',
            address: {
              street: '123 Main St',
              city: 'Anytown',
              state: 'CA',
              zip: '12345',
              coordinates: {
                lat: 40.7128,
                lng: -74.0060
              }
            }
          },
          preferences: {
            theme: 'dark',
            notifications: {
              email: true,
              sms: false,
              push: true
            }
          }
        },
        metadata: {
          tags: ['user', 'premium', 'verified'],
          scores: [95, 87, 92, 88],
          settings: {
            language: 'en',
            timezone: 'UTC',
            currency: 'USD'
          }
        }
      };

      const plugins = ['local', 'lowdb', 'sqlite3'];
      const results = {};

      for (const plugin of plugins) {
        const db = database(plugin, testConfigs[plugin]);
        
        // Create complex data
        const created = await db.create('users', complexData);
        expect(created).toBeDefined();
        expect(created.name).toBe(complexData.name);

        // Verify complex data integrity
        const found = await db.findOne('users', { name: 'Complex User' });
        expect(found).toBeDefined();
        expect(found.name).toBe(complexData.name);
        expect(found.profile.personal.firstName).toBe('John');
        expect(found.profile.personal.address.street).toBe('123 Main St');
        expect(found.profile.personal.address.coordinates.lat).toBe(40.7128);
        expect(found.profile.preferences.theme).toBe('dark');
        expect(found.profile.preferences.notifications.email).toBe(true);
        expect(found.metadata.tags).toEqual(['user', 'premium', 'verified']);
        expect(found.metadata.scores).toEqual([95, 87, 92, 88]);
        expect(found.metadata.settings.language).toBe('en');

        results[plugin] = { success: true };
      }

      // All plugins should handle complex data consistently
      Object.values(results).forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Plugin Switching', () => {
    test('should allow switching between plugins seamlessly', async () => {
      const testData = { name: 'Switch Test', value: 'test-value' };

      // Start with local
      const localDb = database('local', testConfigs.local);
      const localResult = await localDb.create('test', testData);
      expect(localResult).toBeDefined();

      // Switch to lowdb
      const lowdbDb = database('lowdb', testConfigs.lowdb);
      const lowdbResult = await lowdbDb.create('test', testData);
      expect(lowdbResult).toBeDefined();

      // Switch to sqlite3
      const sqliteDb = database('sqlite3', testConfigs.sqlite3);
      const sqliteResult = await sqliteDb.create('test', testData);
      expect(sqliteResult).toBeDefined();

      // Verify each plugin has its own data
      const localData = await localDb.find('test');
      const lowdbData = await lowdbDb.find('test');
      const sqliteData = await sqliteDb.find('test');

      expect(localData.length).toBe(1);
      expect(lowdbData.length).toBe(1);
      expect(sqliteData.length).toBe(1);

      expect(localData[0].name).toBe('Switch Test');
      expect(lowdbData[0].name).toBe('Switch Test');
      expect(sqliteData[0].name).toBe('Switch Test');
    });

    test('should maintain separate namespaces for different plugins', async () => {
      const configs = {
        local: { path: './test-data/integration/local', namespace: 'namespace1' },
        lowdb: { filepath: './test-data/integration/lowdb', database: 'namespace1.json' },
        sqlite3: { file: './test-data/integration/sqlite3/namespace1.sqlite' }
      };

      const db1 = database('local', configs.local);
      const db2 = database('lowdb', configs.lowdb);
      const db3 = database('sqlite3', configs.sqlite3);

      // Create data in each plugin
      await db1.create('users', { name: 'Local User', plugin: 'local' });
      await db2.create('users', { name: 'LowDB User', plugin: 'lowdb' });
      await db3.create('users', { name: 'SQLite User', plugin: 'sqlite3' });

      // Verify each plugin only sees its own data
      const localUsers = await db1.find('users');
      const lowdbUsers = await db2.find('users');
      const sqliteUsers = await db3.find('users');

      expect(localUsers.length).toBe(1);
      expect(lowdbUsers.length).toBe(1);
      expect(sqliteUsers.length).toBe(1);

      expect(localUsers[0].plugin).toBe('local');
      expect(lowdbUsers[0].plugin).toBe('lowdb');
      expect(sqliteUsers[0].plugin).toBe('sqlite3');
    });
  });
});
