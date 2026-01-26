---
'@feizk/parser': patch
---

->

- Modified the `validateType` method in `packages/parser/src/validation/index.ts` to add pattern validation for array elements, checking each string element against the regex pattern
- Added a new test case in `packages/parser/tests/schema.test.ts` to verify array pattern validation works correctly
- Updated `packages/parser/README.md` to document the `pattern` property for array arguments and included an example
- Ran all tests to confirm the implementation passes and maintains existing functionality
