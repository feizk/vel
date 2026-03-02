# @feizk/logger

## 2.1.0

### Minor Changes

- 95425f7: ## @feizk/logger-discord
  - Added new Discord transport plugin for logger
    - Supports customizable Discord webhook URL
    - Configurable username and avatar
    - Per-level log filtering with color-coded embeds
    - Custom formatter and payload support
    - Context inclusion in embeds

  ## @feizk/logger
  - Improved argument formatting with special type handling:
    - Error objects now include name, message, and stack trace
    - BigInt values display with 'n' suffix
    - Symbol values display with toString()
    - Circular references handled safely in objects
  - Exported utils module for external use

## 2.0.0

### Major Changes

- a27012b: Complete rewrite of @feizk/logger
  - Added 2 new log levels: `trace` and `fatal` (total 6 levels)
  - Implemented structured JSON logging mode for production environments
  - Created pluggable transport system for custom log outputs
  - Added child logger support with prefix and context merging
  - Removed Discord transport (moved to separate @feizk/logger-discord package)
  - Removed chalk dependency for zero-dependency implementation
  - Added silent mode to suppress console while keeping transports active
  - Improved TypeScript types with LogEntry and Transport interfaces
  - Added destroy() method for cleanup

  **BREAKING CHANGE**: The logger API has been redesigned. Removed options `discord`, `formatTimestamp`, and `formatLog`. Added new options `timestamp`, `json`, `transports`, `prefix`, `context`, and `silent`. Discord transport is now available via separate package.

## 1.7.0

### Minor Changes

- 245a016: ->
  Improved discord webhook logging.

## 1.6.0

### Minor Changes

- c13afc7: Implemented transport logs to discord using webhooks.

## 1.5.1

### Patch Changes

- 2de0821: Added the "files" property to execlude unnecessary files / folders

## 1.5.0

### Minor Changes

- f3f8525: - Renamed `timestampFormat` to `formatTimestamp` and changed it to always be a function returning `[TimestampType, string]`
  - Renamed `logFormat` to `formatLog`
  - Renamed `logLevel` to `level`
  - Renamed `setLogLevel` method to `setLevel`
  - Added `TimestampTypes` interface and `TimestampType` union type for type safety
  - Exported `TIMESTAMP_TYPES` constant and new types from the package index
  - Updated `LoggerOptions` interface with new option names and types
  - Modified `formatTimestamp` utility function to accept and call the user-provided function
  - Updated all test cases to use the new option formats
  - Updated README.md documentation, examples, and API reference

## 1.4.0

### Minor Changes

- 2b7b1eb: - Added `LogLevel` type ('debug' | 'info' | 'warn' | 'error') and `logLevel` option to `LoggerOptions` in `types.ts`
  - Updated `logger.ts` to implement log level filtering with a `LOG_LEVEL_PRIORITIES` constant, `shouldLog` private method, and checks before each log call
  - Added `setLogLevel` method to `logger.ts` for dynamic runtime level changes
  - Exported `LogLevel` type from `index.ts` for external use
  - Added comprehensive test cases in `logger.test.ts` for filtering behavior at different levels, dynamic level changes, and default behavior
  - Updated `README.md` with `logLevel` option documentation, usage examples, and API details for the new method

## 1.3.0

### Minor Changes

- 6e3d7e5: - Created `src/types.ts` with `LoggerOptions` interface for `enableColors`, `timestampFormat`, and `logFormat` options\n- Created `src/utils.ts` with utility functions: `formatTimestamp`, `getColor`, and `formatLog`\n- Moved `Logger` class to `src/logger.ts` and made it configurable via constructor options with defaults\n- Updated `src/index.ts` to export `Logger` class and `LoggerOptions` type instead of containing the class\n- Removed the `success` method from `Logger` class (per user feedback)\n- Removed `[SUCCESS]` color mapping from `utils.ts`\n- Added tests in `tests/logger.test.ts` for disabling colors, locale timestamp, custom timestamp function, and custom log format\n- Removed success-related test from `tests/logger.test.ts`\n- Updated `README.md` with usage examples for new options and removed success method documentation\n- Ensured backward compatibility: existing `new Logger()` usage remains unchanged\n- All tests pass (10 tests) and build succeeds

## 1.2.0

### Minor Changes

- 4b70f01: Accept multiple arguments and Any type of arguments on all Logger methods

## 1.1.0

### Minor Changes

- ebc4e0b: Add success logging method to Logger class
