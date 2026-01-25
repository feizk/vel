# @feizk/parser

## 1.6.0

### Minor Changes

- 3b40df1: - Refactored Parser class into separate `MessageParser` and `SchemaValidator` classes for better modularity
  - Added schema validation system with `CommandSchema` and `ArgumentSchema` interfaces
  - Introduced `registerSchema()` method to define validation rules for commands and arguments
  - Integrated `@feizk/logger` for debug logging with new `DebugOptions` in parser configuration
  - Extended argument types to include `date` and `array`, with comprehensive validation constraints
  - Added `validationErrors` field to `ParsedCommand` for schema validation feedback
  - Added `getLastParsed()` method to retrieve the most recent parsed command
  - Created `schema.test.ts` with tests for validation features
  - Updated README.md with schema validation documentation and examples
  - Enhanced type safety and error handling throughout the codebase

## 1.5.1

### Patch Changes

- 2de0821: Added the "files" property to execlude unnecessary files / folders

## 1.5.0

### Minor Changes

- 253b083: - Created a new `src/utils.ts` file containing the extracted `tokenize` and `coerceValue` functions from the Parser class
  - Updated the Parser class in `src/index.ts` to import and call these utility functions instead of private methods, making the class shorter
  - Refactored `src/index.ts` to export only the public API: the Parser class and the ParserOptions and ParsedCommand types
  - Removed the unnecessary `test` function export from `src/index.ts`
  - Condensed `README.md` to be shorter, cleaner, and more readable by reducing examples, simplifying the API section, and focusing on essential usage information
  - Verified the changes by building the package and running all tests, which passed successfully
