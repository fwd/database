const cache = require('../plugins/cache/cache');

describe('Cache Module Tests', () => {
  let testCache;

  beforeEach(() => {
    testCache = new cache.Cache();
  });

  afterEach(() => {
    testCache.clear();
  });

  describe('Basic Operations', () => {
    test('should put and get values', () => {
      testCache.put('key1', 'value1');
      const result = testCache.get('key1');
      expect(result).toBe('value1');
    });

    test('should return null for non-existent key', () => {
      const result = testCache.get('non-existent');
      expect(result).toBeNull();
    });

    test('should overwrite existing values', () => {
      testCache.put('key1', 'value1');
      testCache.put('key1', 'value2');
      const result = testCache.get('key1');
      expect(result).toBe('value2');
    });

    test('should handle different data types', () => {
      const testData = {
        string: 'test string',
        number: 42,
        boolean: true,
        null: null,
        object: { nested: 'value' },
        array: [1, 2, 3]
      };

      Object.entries(testData).forEach(([key, value]) => {
        testCache.put(key, value);
        expect(testCache.get(key)).toEqual(value);
      });
    });
  });

  describe('Expiration', () => {
    test('should expire values after timeout', async () => {
      testCache.put('key1', 'value1', 50);
      
      expect(testCache.get('key1')).toBe('value1');
      
      await waitFor(60);
      
      expect(testCache.get('key1')).toBeNull();
    });

    test('should not expire values without timeout', async () => {
      testCache.put('key1', 'value1');
      
      await waitFor(100);
      
      expect(testCache.get('key1')).toBe('value1');
    });

    test('should call timeout callback on expiration', async () => {
      const callback = jest.fn();
      testCache.put('key1', 'value1', 50, callback);
      
      await waitFor(60);
      
      expect(callback).toHaveBeenCalledWith('key1', 'value1');
    });

    test('should handle multiple expiring values', async () => {
      testCache.put('key1', 'value1', 50);
      testCache.put('key2', 'value2', 100);
      testCache.put('key3', 'value3', 150);
      
      expect(testCache.get('key1')).toBe('value1');
      expect(testCache.get('key2')).toBe('value2');
      expect(testCache.get('key3')).toBe('value3');
      
      await waitFor(60);
      
      expect(testCache.get('key1')).toBeNull();
      expect(testCache.get('key2')).toBe('value2');
      expect(testCache.get('key3')).toBe('value3');
      
      await waitFor(50);
      
      expect(testCache.get('key2')).toBeNull();
      expect(testCache.get('key3')).toBe('value3');
      
      await waitFor(50);
      
      expect(testCache.get('key3')).toBeNull();
    });
  });

  describe('Deletion', () => {
    test('should delete existing values', () => {
      testCache.put('key1', 'value1');
      const deleted = testCache.del('key1');
      
      expect(deleted).toBe(true);
      expect(testCache.get('key1')).toBeNull();
    });

    test('should return false when deleting non-existent key', () => {
      const deleted = testCache.del('non-existent');
      expect(deleted).toBe(false);
    });

    test('should clear timeout when deleting', async () => {
      const callback = jest.fn();
      testCache.put('key1', 'value1', 100, callback);
      
      testCache.del('key1');
      
      await waitFor(150);
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('should not delete expired values', async () => {
      testCache.put('key1', 'value1', 50);
      
      await waitFor(60);
      
      const deleted = testCache.del('key1');
      expect(deleted).toBe(false);
    });
  });

  describe('Clear Operations', () => {
    test('should clear all values', () => {
      testCache.put('key1', 'value1');
      testCache.put('key2', 'value2');
      testCache.put('key3', 'value3');
      
      testCache.clear();
      
      expect(testCache.get('key1')).toBeNull();
      expect(testCache.get('key2')).toBeNull();
      expect(testCache.get('key3')).toBeNull();
    });

    test('should clear timeouts when clearing', async () => {
      const callback = jest.fn();
      testCache.put('key1', 'value1', 100, callback);
      
      testCache.clear();
      
      await waitFor(150);
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('should reset debug counters when clearing', () => {
      testCache.debug(true);
      testCache.put('key1', 'value1');
      testCache.get('key1');
      testCache.get('non-existent');
      
      expect(testCache.hits()).toBe(1);
      expect(testCache.misses()).toBe(1);
      
      testCache.clear();
      
      expect(testCache.hits()).toBe(0);
      expect(testCache.misses()).toBe(0);
    });
  });

  describe('Size and Statistics', () => {
    test('should track cache size', () => {
      expect(testCache.size()).toBe(0);
      
      testCache.put('key1', 'value1');
      expect(testCache.size()).toBe(1);
      
      testCache.put('key2', 'value2');
      expect(testCache.size()).toBe(2);
      
      testCache.del('key1');
      expect(testCache.size()).toBe(1);
    });

    test('should track memory size', () => {
      expect(testCache.memsize()).toBe(0);
      
      testCache.put('key1', 'value1');
      expect(testCache.memsize()).toBe(1);
      
      testCache.put('key2', 'value2');
      expect(testCache.memsize()).toBe(2);
    });

    test('should track hits and misses in debug mode', () => {
      testCache.debug(true);
      
      testCache.put('key1', 'value1');
      testCache.get('key1'); // hit
      testCache.get('key1'); // hit
      testCache.get('non-existent'); // miss
      testCache.get('non-existent'); // miss
      
      expect(testCache.hits()).toBe(2);
      expect(testCache.misses()).toBe(2);
    });

    test('should not track hits and misses when debug is off', () => {
      testCache.debug(false);
      
      testCache.put('key1', 'value1');
      testCache.get('key1');
      testCache.get('non-existent');
      
      expect(testCache.hits()).toBe(0);
      expect(testCache.misses()).toBe(0);
    });

    test('should return cache keys', () => {
      testCache.put('key1', 'value1');
      testCache.put('key2', 'value2');
      
      const keys = testCache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });
  });

  describe('Debug Mode', () => {
    test('should enable debug mode', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      testCache.debug(true);
      testCache.put('key1', 'value1', 1000);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'caching: %s = %j (@%s)',
        'key1',
        'value1',
        1000
      );
      
      consoleSpy.mockRestore();
    });

    test('should disable debug mode', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      testCache.debug(false);
      testCache.put('key1', 'value1', 1000);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Export and Import', () => {
    test('should export cache to JSON', () => {
      testCache.put('key1', 'value1', 1000);
      testCache.put('key2', 'value2'); // no expiration
      
      const json = testCache.exportJson();
      const parsed = JSON.parse(json);
      
      expect(parsed.key1.value).toBe('value1');
      expect(parsed.key1.expire).toBeDefined();
      expect(parsed.key2.value).toBe('value2');
      expect(parsed.key2.expire).toBe('NaN');
    });

    test('should import cache from JSON', () => {
      const jsonData = {
        key1: { value: 'value1', expire: Date.now() + 1000 },
        key2: { value: 'value2', expire: 'NaN' }
      };
      
      const imported = testCache.importJson(JSON.stringify(jsonData));
      
      expect(imported).toBe(2);
      expect(testCache.get('key1')).toBe('value1');
      expect(testCache.get('key2')).toBe('value2');
    });

    test('should skip expired entries on import', () => {
      const jsonData = {
        key1: { value: 'value1', expire: Date.now() - 1000 }, // expired
        key2: { value: 'value2', expire: Date.now() + 1000 } // not expired
      };
      
      const imported = testCache.importJson(JSON.stringify(jsonData));
      
      expect(imported).toBe(1);
      expect(testCache.get('key1')).toBeNull();
      expect(testCache.get('key2')).toBe('value2');
    });

    test('should skip duplicates on import with skipDuplicates option', () => {
      testCache.put('key1', 'existing');
      
      const jsonData = {
        key1: { value: 'new', expire: 'NaN' },
        key2: { value: 'value2', expire: 'NaN' }
      };
      
      const imported = testCache.importJson(JSON.stringify(jsonData), { skipDuplicates: true });
      
      expect(imported).toBe(1);
      expect(testCache.get('key1')).toBe('existing'); // should keep existing
      expect(testCache.get('key2')).toBe('value2'); // should import new
    });

    test('should handle import without skipDuplicates option', () => {
      testCache.put('key1', 'existing');
      
      const jsonData = {
        key1: { value: 'new', expire: 'NaN' },
        key2: { value: 'value2', expire: 'NaN' }
      };
      
      const imported = testCache.importJson(JSON.stringify(jsonData));
      
      expect(imported).toBe(2);
      expect(testCache.get('key1')).toBe('new'); // should overwrite
      expect(testCache.get('key2')).toBe('value2'); // should import new
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid timeout', () => {
      expect(() => {
        testCache.put('key1', 'value1', -1);
      }).toThrow('Cache timeout must be a positive number');
      
      expect(() => {
        testCache.put('key1', 'value1', 'invalid');
      }).toThrow('Cache timeout must be a positive number');
      
      expect(() => {
        testCache.put('key1', 'value1', 0);
      }).toThrow('Cache timeout must be a positive number');
    });

    test('should throw error for invalid timeout callback', () => {
      expect(() => {
        testCache.put('key1', 'value1', 1000, 'not-a-function');
      }).toThrow('Cache timeout callback must be a function');
    });

    test('should handle malformed JSON on import', () => {
      expect(() => {
        testCache.importJson('invalid json');
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large values', () => {
      const largeValue = 'x'.repeat(100000);
      testCache.put('large', largeValue);
      
      expect(testCache.get('large')).toBe(largeValue);
    });

    test('should handle special characters in keys', () => {
      const specialKeys = [
        'key with spaces',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key123',
        'key!@#$%^&*()',
        'key\nwith\nnewlines',
        'key\twith\ttabs'
      ];
      
      specialKeys.forEach((key, index) => {
        testCache.put(key, `value${index}`);
        expect(testCache.get(key)).toBe(`value${index}`);
      });
    });

    test('should handle circular references', () => {
      const circular = { name: 'test' };
      circular.self = circular;
      
      testCache.put('circular', circular);
      const result = testCache.get('circular');
      
      expect(result).toBeDefined();
      expect(result.name).toBe('test');
      expect(result.self).toBe(result);
    });

    test('should handle undefined values', () => {
      testCache.put('undefined', undefined);
      const result = testCache.get('undefined');
      
      expect(result).toBeUndefined();
    });

    test('should handle null values', () => {
      testCache.put('null', null);
      const result = testCache.get('null');
      
      expect(result).toBeNull();
    });

    test('should handle NaN values', () => {
      testCache.put('nan', NaN);
      const result = testCache.get('nan');
      
      expect(Number.isNaN(result)).toBe(true);
    });

    test('should handle Infinity values', () => {
      testCache.put('infinity', Infinity);
      testCache.put('negativeInfinity', -Infinity);
      
      expect(testCache.get('infinity')).toBe(Infinity);
      expect(testCache.get('negativeInfinity')).toBe(-Infinity);
    });
  });

  describe('Performance', () => {
    test('should handle many operations efficiently', () => {
      const start = Date.now();
      
      // Put many values
      for (let i = 0; i < 1000; i++) {
        testCache.put(`key${i}`, `value${i}`);
      }
      
      // Get many values
      for (let i = 0; i < 1000; i++) {
        testCache.get(`key${i}`);
      }
      
      // Delete many values
      for (let i = 0; i < 1000; i++) {
        testCache.del(`key${i}`);
      }
      
      const end = Date.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
      expect(testCache.size()).toBe(0);
    });

    test('should handle rapid expiration', async () => {
      const callbacks = [];
      
      // Set many short-lived values
      for (let i = 0; i < 100; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        testCache.put(`key${i}`, `value${i}`, 10, callback);
      }
      
      await waitFor(20);
      
      // All should be expired
      for (let i = 0; i < 100; i++) {
        expect(testCache.get(`key${i}`)).toBeNull();
      }
      
      // All callbacks should have been called
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalled();
      });
    });
  });

  describe('Module Exports', () => {
    test('should export singleton instance', () => {
      expect(cache).toBeDefined();
      expect(typeof cache.put).toBe('function');
      expect(typeof cache.get).toBe('function');
      expect(typeof cache.del).toBe('function');
      expect(typeof cache.clear).toBe('function');
    });

    test('should export Cache constructor', () => {
      expect(cache.Cache).toBeDefined();
      expect(typeof cache.Cache).toBe('function');
    });

    test('should create independent instances', () => {
      const cache1 = new cache.Cache();
      const cache2 = new cache.Cache();
      
      cache1.put('key1', 'value1');
      cache2.put('key2', 'value2');
      
      expect(cache1.get('key1')).toBe('value1');
      expect(cache1.get('key2')).toBeNull();
      expect(cache2.get('key1')).toBeNull();
      expect(cache2.get('key2')).toBe('value2');
    });
  });
});
