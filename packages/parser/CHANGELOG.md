# @feizk/parser

## 1.5.0

### Minor Changes

- 253b083: - Created a new `src/utils.ts` file containing the extracted `tokenize` and `coerceValue` functions from the Parser class
  - Updated the Parser class in `src/index.ts` to import and call these utility functions instead of private methods, making the class shorter
  - Refactored `src/index.ts` to export only the public API: the Parser class and the ParserOptions and ParsedCommand types
  - Removed the unnecessary `test` function export from `src/index.ts`
  - Condensed `README.md` to be shorter, cleaner, and more readable by reducing examples, simplifying the API section, and focusing on essential usage information
  - Verified the changes by building the package and running all tests, which passed successfully
