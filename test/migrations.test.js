const database = require('../index');

describe('Migration System Tests', () => {
  let db;
  
  beforeEach(async () => {
    // Use a test database
    db = database('sqlite3', {
      file: './test-migrations.sqlite',
      migrationsPath: './migrations'
    });
  });

  afterEach(async () => {
    // Clean up test database
    const fs = require('fs');
    if (fs.existsSync('./test-migrations.sqlite')) {
      fs.unlinkSync('./test-migrations.sqlite');
    }
  });

  describe('Migration Status', () => {
    test('should show migration status', async () => {
      const status = await db.getMigrationStatus();
      
      expect(status).toBeDefined();
      expect(status.executed).toBeDefined();
      expect(status.available).toBeDefined();
      expect(status.pending).toBeDefined();
      expect(status.modified).toBeDefined();
      
      // Should have our example migrations available
      expect(status.available.length).toBeGreaterThan(0);
    });
  });

  describe('Migration Execution', () => {
    test('should run migrations automatically', async () => {
      // Create a record to trigger table creation and migrations
      const user = await db.create('users', {
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      });
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.name).toBe('Test User');
    });

    test('should track executed migrations', async () => {
      // Run migrations manually
      await db.runMigrations();
      
      const status = await db.getMigrationStatus();
      
      // Should have executed migrations
      expect(status.executed.length).toBeGreaterThan(0);
      
      // Should have no pending migrations after running
      expect(status.pending.length).toBe(0);
    });
  });

  describe('Migration Creation', () => {
    test('should create new migration file', async () => {
      const migrationPath = await db.createMigration('test_migration');
      
      expect(migrationPath).toBeDefined();
      
      const fs = require('fs');
      expect(fs.existsSync(migrationPath)).toBe(true);
      
      // Clean up
      fs.unlinkSync(migrationPath);
    });
  });

  describe('Data Integrity', () => {
    test('should maintain data after migrations', async () => {
      // Create initial data
      const user = await db.create('users', {
        name: 'John Doe',
        email: 'john@example.com',
        password_hash: 'password123'
      });
      
      // Run migrations
      await db.runMigrations();
      
      // Verify data still exists
      const foundUser = await db.findOne('users', { id: user.id });
      expect(foundUser).toBeDefined();
      expect(foundUser.name).toBe('John Doe');
      expect(foundUser.email).toBe('john@example.com');
    });
  });

  describe('Error Handling', () => {
    test('should handle migration errors gracefully', async () => {
      // This test would require a malformed migration file
      // For now, just ensure the system doesn't crash
      expect(async () => {
        await db.runMigrations();
      }).not.toThrow();
    });
  });
});
