const database = require('../index');
const fs = require('fs-extra');
const path = require('path');

describe('Configurable Migrations Path Tests', () => {
  let testDbPath;
  
  beforeEach(async () => {
    testDbPath = `./test-configurable-migrations-${Date.now()}.sqlite`;
  });

  afterEach(async () => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Clean up test migration directories
    const testDirs = [
      './test-migrations',
      './test-db-migrations', 
      './test-database-migrations',
      './custom-migrations',
      './db/migrations'  // Clean up fallback test directory
    ];
    
    for (const dir of testDirs) {
      if (fs.existsSync(dir)) {
        await fs.remove(dir);
      }
    }
  });

  describe('Migration Path Configuration', () => {
    test('should use custom migrationsPath', async () => {
      // Create custom migrations directory
      await fs.ensureDir('./custom-migrations');
      
      // Create a simple migration
      const migrationContent = `module.exports = {
        up: async (db) => {
          await new Promise((resolve, reject) => {
            db.run('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)', (err) => {
              if (err) reject(err)
              else resolve()
            })
          })
        },
        down: async (db) => {
          await new Promise((resolve, reject) => {
            db.run('DROP TABLE IF EXISTS test_table', (err) => {
              if (err) reject(err)
              else resolve()
            })
          })
        }
      }`;
      
      fs.writeFileSync('./custom-migrations/001_test_migration.js', migrationContent);
      
      const db = database('sqlite3', {
        file: testDbPath,
        migrationsPath: './custom-migrations'
      });
      
      // Check that the path is correctly configured
      expect(db.getMigrationsPath()).toBe('./custom-migrations');
      
      // Create a record to trigger migrations
      const user = await db.create('users', { name: 'Test User' });
      expect(user).toBeDefined();
    });

    test('should use migrations_dir alternative naming', async () => {
      await fs.ensureDir('./test-db-migrations');
      
      const db = database('sqlite3', {
        file: testDbPath,
        migrations_dir: './test-db-migrations'
      });
      
      expect(db.getMigrationsPath()).toBe('./test-db-migrations');
    });

    test('should use migrationsDir camelCase alternative', async () => {
      await fs.ensureDir('./test-database-migrations');
      
      const db = database('sqlite3', {
        file: testDbPath,
        migrationsDir: './test-database-migrations'
      });
      
      expect(db.getMigrationsPath()).toBe('./test-database-migrations');
    });

    test('should fallback to default ./migrations', async () => {
      const db = database('sqlite3', {
        file: testDbPath
        // No migrations path specified
      });
      
      expect(db.getMigrationsPath()).toBe('./migrations');
    });

    test('should create migrations directory if it does not exist', async () => {
      const db = database('sqlite3', {
        file: testDbPath,
        migrationsPath: './test-migrations',
        debug: true
      });
      
      // Create a migration - this should create the directory
      const migrationPath = await db.createMigration('test_migration');
      
      expect(fs.existsSync('./test-migrations')).toBe(true);
      expect(fs.existsSync(migrationPath)).toBe(true);
      
      // Clean up
      fs.unlinkSync(migrationPath);
    });
  });

  describe('Migration Path Fallbacks', () => {
    test('should find migrations in fallback directories', async () => {
      // Create migrations in a fallback directory
      await fs.ensureDir('./db/migrations');
      
      const migrationContent = `module.exports = {
        up: async (db) => {
          await new Promise((resolve, reject) => {
            db.run('CREATE TABLE IF NOT EXISTS fallback_test (id INTEGER PRIMARY KEY)', (err) => {
              if (err) reject(err)
              else resolve()
            })
          })
        }
      }`;
      
      fs.writeFileSync('./db/migrations/001_fallback_test.js', migrationContent);
      
      const db = database('sqlite3', {
        file: testDbPath,
        migrationsPath: './nonexistent-migrations' // This path doesn't exist
      });
      
      // Should still find migrations in fallback directory
      const status = await db.getMigrationStatus();
      expect(status.available.length).toBeGreaterThan(0);
    });

    test('should handle no migrations directory gracefully', async () => {
      // Create a completely isolated test environment
      const isolatedDbPath = `./test-isolated-${Date.now()}.sqlite`;
      
      // Temporarily move the existing migrations directory
      const tempMigrationsPath = `./temp-migrations-${Date.now()}`;
      if (fs.existsSync('./migrations')) {
        fs.moveSync('./migrations', tempMigrationsPath);
      }
      
      try {
        const db = database('sqlite3', {
          file: isolatedDbPath,
          migrationsPath: './nonexistent-migrations',
          debug: true
        });
        
        const status = await db.getMigrationStatus();
        expect(status.available).toEqual([]);
        expect(status.pending).toEqual([]);
        
        // Clean up isolated database
        if (fs.existsSync(isolatedDbPath)) {
          fs.unlinkSync(isolatedDbPath);
        }
      } finally {
        // Restore the migrations directory
        if (fs.existsSync(tempMigrationsPath)) {
          fs.moveSync(tempMigrationsPath, './migrations');
        }
      }
    });
  });

  describe('Debug Mode', () => {
    test('should show debug information when enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const db = database('sqlite3', {
        file: testDbPath,
        migrationsPath: './nonexistent-migrations',
        debug: true
      });
      
      await db.getMigrationStatus();
      
      // Should have logged debug information
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No migrations directory found')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Migration Status with Custom Paths', () => {
    test('should show correct status for custom migration paths', async () => {
      await fs.ensureDir('./test-migrations');
      
      const migrationContent = `module.exports = {
        up: async (db) => {
          await new Promise((resolve, reject) => {
            db.run('CREATE TABLE IF NOT EXISTS status_test (id INTEGER PRIMARY KEY)', (err) => {
              if (err) reject(err)
              else resolve()
            })
          })
        }
      }`;
      
      fs.writeFileSync('./test-migrations/001_status_test.js', migrationContent);
      
      const db = database('sqlite3', {
        file: testDbPath,
        migrationsPath: './test-migrations'
      });
      
      const status = await db.getMigrationStatus();
      
      expect(status.available.length).toBe(1);
      expect(status.available[0].filename).toBe('001_status_test.js');
      expect(status.pending.length).toBe(1);
      expect(status.executed.length).toBe(0);
    });
  });
});
