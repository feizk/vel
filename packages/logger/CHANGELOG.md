# @feizk/logger

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
