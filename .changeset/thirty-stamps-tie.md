---
'@feizk/logger': minor
---

- Renamed `timestampFormat` to `formatTimestamp` and changed it to always be a function returning `[TimestampType, string]`
- Renamed `logFormat` to `formatLog`
- Renamed `logLevel` to `level`
- Renamed `setLogLevel` method to `setLevel`
- Added `TimestampTypes` interface and `TimestampType` union type for type safety
- Exported `TIMESTAMP_TYPES` constant and new types from the package index
- Updated `LoggerOptions` interface with new option names and types
- Modified `formatTimestamp` utility function to accept and call the user-provided function
- Updated all test cases to use the new option formats
- Updated README.md documentation, examples, and API reference