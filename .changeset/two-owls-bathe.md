---
'@feizk/parser': minor
---


- Refactored Parser class into separate `MessageParser` and `SchemaValidator` classes for better modularity
- Added schema validation system with `CommandSchema` and `ArgumentSchema` interfaces
- Introduced `registerSchema()` method to define validation rules for commands and arguments
- Integrated `@feizk/logger` for debug logging with new `DebugOptions` in parser configuration
- Extended argument types to include `date` and `array`, with comprehensive validation constraints
- Added `validationErrors` field to `ParsedCommand` for schema validation feedback
- Added `getLastParsed()` method to retrieve the most recent parsed command
- Created `schema.test.ts` with tests for validation features
- Updated README.md with schema validation documentation and examples
- Enhanced type safety and error handling throughout the codebase