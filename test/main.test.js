const database = require('../index');

describe('Main Database Module', () => {
  let mockConsole;

  beforeEach(() => {
    mockConsole = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    mockConsole.mockRestore();
  });

  describe('Plugin Loading', () => {
    test('should load local plugin by default when no plugin specified', () => {
      const db = database();
      expect(db).toBeDefined();
      expect(typeof db.create).toBe('function');
      expect(typeof db.find).toBe('function');
      expect(typeof db.update).toBe('function');
      expect(typeof db.delete).toBe('function');
    });

    test('should load local plugin explicitly', () => {
      const db = database('local');
      expect(db).toBeDefined();
      expect(typeof db.create).toBe('function');
    });

    test('should load lowdb plugin', () => {
      const db = database('lowdb');
      expect(db).toBeDefined();
      expect(typeof db.create).toBe('function');
    });

    test('should load sqlite3 plugin', () => {
      const db = database('sqlite3');
      expect(db).toBeDefined();
      expect(typeof db.create).toBe('function');
    });

    test('should load sqlite plugin (alias)', () => {
      const db = database('sqlite');
      expect(db).toBeDefined();
      expect(typeof db.create).toBe('function');
    });

    test('should handle case insensitive plugin names', () => {
      const db1 = database('LOCAL');
      const db2 = database('LowDB');
      const db3 = database('SQLITE3');
      
      expect(db1).toBeDefined();
      expect(db2).toBeDefined();
      expect(db3).toBeDefined();
    });

    test('should return error for unsupported plugins', () => {
      const mockError = jest.spyOn(console, 'error').mockImplementation();
      
      const result = database('unsupported');
      
      expect(result).toBeUndefined();
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("Plugin 'unsupported' not supported yet")
      );
      
      mockError.mockRestore();
    });

    test('should handle empty string plugin name', () => {
      const db = database('');
      expect(db).toBeDefined();
      expect(mockConsole).toHaveBeenCalledWith(
        expect.stringContaining('No plugin name supplied. Defaulting to local')
      );
    });

    test('should handle null plugin name', () => {
      const db = database(null);
      expect(db).toBeDefined();
      expect(mockConsole).toHaveBeenCalledWith(
        expect.stringContaining('No plugin name supplied. Defaulting to local')
      );
    });

    test('should handle undefined plugin name', () => {
      const db = database(undefined);
      expect(db).toBeDefined();
      expect(mockConsole).toHaveBeenCalledWith(
        expect.stringContaining('No plugin name supplied. Defaulting to local')
      );
    });
  });

  describe('Configuration Handling', () => {
    test('should pass configuration to plugins', () => {
      const config = { namespace: 'test-namespace', path: './test-data' };
      const db = database('local', config);
      expect(db).toBeDefined();
    });

    test('should handle null configuration', () => {
      const db = database('local', null);
      expect(db).toBeDefined();
    });

    test('should handle undefined configuration', () => {
      const db = database('local', undefined);
      expect(db).toBeDefined();
    });

    test('should handle empty object configuration', () => {
      const db = database('local', {});
      expect(db).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle plugin loading errors gracefully', () => {
      const mockError = jest.spyOn(console, 'log').mockImplementation();
      
      // Mock require to throw an error
      const originalRequire = require;
      jest.doMock('../plugins/local', () => {
        throw new Error('Plugin loading error');
      });
      
      const result = database('local');
      
      expect(result).toBeUndefined();
      expect(mockError).toHaveBeenCalledWith(
        'Database Error:',
        expect.any(Error)
      );
      
      mockError.mockRestore();
    });

    test('should handle malformed plugin names', () => {
      const mockError = jest.spyOn(console, 'error').mockImplementation();
      
      const result = database('invalid-plugin-name-with-special-chars!@#$%');
      
      expect(result).toBeUndefined();
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("Plugin 'invalid-plugin-name-with-special-chars!@#$%' not supported yet")
      );
      
      mockError.mockRestore();
    });
  });

  describe('Plugin Compatibility', () => {
    test('should provide consistent API across all plugins', () => {
      const plugins = ['local', 'lowdb', 'sqlite3'];
      
      plugins.forEach(plugin => {
        const db = database(plugin);
        expect(db).toBeDefined();
        
        // Check for required methods
        expect(typeof db.create).toBe('function');
        expect(typeof db.find).toBe('function');
        expect(typeof db.findOne).toBe('function');
        expect(typeof db.update).toBe('function');
        expect(typeof db.delete).toBe('function');
        expect(typeof db.remove).toBe('function');
        expect(typeof db.set).toBe('function');
      });
    });

    test('should handle disabled plugins gracefully', () => {
      const mockError = jest.spyOn(console, 'error').mockImplementation();
      
      // Test commented out plugins
      const result1 = database('mongodb');
      const result2 = database('mariadb');
      const result3 = database('mysql');
      
      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      expect(result3).toBeUndefined();
      
      expect(mockError).toHaveBeenCalledTimes(3);
      
      mockError.mockRestore();
    });
  });

  describe('Module Exports', () => {
    test('should export a function', () => {
      expect(typeof database).toBe('function');
    });

    test('should accept two parameters', () => {
      expect(database.length).toBe(2);
    });
  });
});
