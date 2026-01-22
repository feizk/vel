---
'@feizk/logger': minor
---

- Added `LogLevel` type ('debug' | 'info' | 'warn' | 'error') and `logLevel` option to `LoggerOptions` in `types.ts`
- Updated `logger.ts` to implement log level filtering with a `LOG_LEVEL_PRIORITIES` constant, `shouldLog` private method, and checks before each log call
- Added `setLogLevel` method to `logger.ts` for dynamic runtime level changes
- Exported `LogLevel` type from `index.ts` for external use
- Added comprehensive test cases in `logger.test.ts` for filtering behavior at different levels, dynamic level changes, and default behavior
- Updated `README.md` with `logLevel` option documentation, usage examples, and API details for the new method
