
## 📊 Performance Benchmarks

*Results from automated testing of read, write, and concurrency performance*

### 📝 Write Performance (milliseconds)

| Database | Small Data | Medium Data | Large Data | Errors |
|----------|------------|-------------|------------|--------|
| local | N/A | N/A | N/A | 0 |
| sqlite3 | N/A | N/A | N/A | 0 |
| lowdb | 3.65ms | 3.69ms | 4.84ms | 0 |

### 📖 Read Performance (milliseconds)

| Database | Find All | Find One | Get All | Errors |
|----------|----------|----------|---------|--------|
| local | N/A | N/A | N/A | 0 |
| sqlite3 | N/A | N/A | N/A | 0 |
| lowdb | 2.5ms | 2.89ms | 2.77ms | 0 |

### 🔄 Concurrency Performance (milliseconds)

| Database | Concurrent Writes | Concurrent Reads | Mixed Ops | Errors |
|----------|-------------------|-----------------|-----------|--------|
| local | N/A | N/A | N/A | 0 |
| sqlite3 | N/A | N/A | N/A | 0 |
| lowdb | 233.4ms | 76.63ms | 147.09ms | 0 |

**Test Configuration:**
- Iterations: 100 per test
- Concurrent Operations: 50
- Data Sizes: Small (~100 bytes), Medium (~500 bytes), Large (~2KB)
- Environment: Node.js on macOS

