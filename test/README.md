# Database Test Suite

This comprehensive test suite provides robust testing for the @fwd/database modular database system. The tests cover all database plugins, error handling, edge cases, and integration scenarios.

## Test Structure

### Test Files

- **`main.test.js`** - Tests for the main database module and plugin loading
- **`local.test.js`** - Comprehensive tests for the local file-based database plugin
- **`lowdb.test.js`** - Tests for the LowDB JSON database plugin
- **`sqlite3.test.js`** - Tests for the SQLite3 database plugin
- **`cache.test.js`** - Tests for the caching functionality
- **`integration.test.js`** - Cross-plugin integration and data migration tests
- **`error-handling.test.js`** - Error handling and edge case tests

### Test Configuration

- **`setup.js`** - Global test setup, cleanup, and helper functions
- **`package.json`** - Updated with Jest configuration and test scripts

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Run only local plugin tests
npm run test:local

# Run only LowDB plugin tests
npm run test:lowdb

# Run only SQLite3 plugin tests
npm run test:sqlite3

# Run only cache tests
npm run test:cache

# Run only integration tests
npm run test:integration
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

## Test Coverage

### Main Module Tests
- ✅ Plugin loading and initialization
- ✅ Configuration handling
- ✅ Error handling for unsupported plugins
- ✅ Case-insensitive plugin names
- ✅ Default plugin fallback

### Local Plugin Tests
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Query operations and filtering
- ✅ Pagination support
- ✅ File system operations
- ✅ Concurrency handling
- ✅ Data validation
- ✅ Error handling
- ✅ Edge cases (special characters, large data, etc.)

### LowDB Plugin Tests
- ✅ JSON file operations
- ✅ Collection management
- ✅ Data persistence
- ✅ Query operations
- ✅ Configuration options
- ✅ Error handling
- ✅ Performance testing

### SQLite3 Plugin Tests
- ✅ Database creation and management
- ✅ Table auto-creation
- ✅ SQL operations
- ✅ Raw query support
- ✅ Migration support
- ✅ Memory database support
- ✅ Transaction handling
- ✅ Error handling

### Cache Module Tests
- ✅ Basic cache operations
- ✅ Expiration handling
- ✅ Memory management
- ✅ Export/import functionality
- ✅ Debug mode
- ✅ Performance testing
- ✅ Error handling

### Integration Tests
- ✅ Cross-plugin API consistency
- ✅ Data migration between plugins
- ✅ Concurrent operations
- ✅ Error handling consistency
- ✅ Performance comparison
- ✅ Data consistency verification

### Error Handling Tests
- ✅ Invalid input handling
- ✅ File system errors
- ✅ Database connection errors
- ✅ Memory and resource limits
- ✅ Concurrency and race conditions
- ✅ Data type edge cases
- ✅ Network and dependency errors
- ✅ Recovery and resilience
- ✅ Performance under stress

## Test Features

### Comprehensive Coverage
- **100+ test cases** covering all major functionality
- **Error scenarios** and edge cases
- **Performance testing** under various conditions
- **Integration testing** across all plugins
- **Data migration** testing between different database types

### Robust Error Handling
- Invalid input validation
- File system error handling
- Database connection error handling
- Memory exhaustion scenarios
- Concurrency conflict resolution
- Data corruption recovery

### Performance Testing
- Bulk operation testing
- Concurrent operation testing
- Memory usage testing
- Stress testing with large datasets
- Response time validation

### Data Integrity
- Cross-plugin data consistency
- Data migration verification
- Complex data structure handling
- Special character and encoding support
- Circular reference handling

## Test Data Management

### Automatic Cleanup
- Test directories are automatically created and cleaned up
- Test files are removed after each test run
- Isolated test environments prevent interference

### Test Data Generation
- Helper functions for creating test data
- Consistent test data across all test suites
- Edge case data generation

### Configuration
- Separate test configurations for each plugin
- Isolated test namespaces
- Temporary file and directory management

## Continuous Integration

The test suite is designed to work with CI/CD pipelines:

- **Fast execution** - Tests complete in under 30 seconds
- **Reliable cleanup** - No leftover test files
- **Cross-platform** - Works on Windows, macOS, and Linux
- **Dependency management** - All required packages included

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Include both positive and negative test cases
3. Test edge cases and error conditions
4. Ensure proper cleanup in `afterEach` hooks
5. Use descriptive test names and comments
6. Add tests for new plugins or features

## Test Results

The test suite provides detailed reporting including:
- Test execution time
- Coverage metrics
- Error details and stack traces
- Performance benchmarks
- Memory usage statistics

Run `npm run test:coverage` to see detailed coverage reports in the `coverage/` directory.
