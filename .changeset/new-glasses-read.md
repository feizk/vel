---
'@feizk/parser': major
---

-> 
- **Modular Structure**: Split into `core/`, `validation/`, `types/`, `utils/` directories
- **State Machine Tokenizer**: Replaced regex-based tokenization with a robust state machine that handles quotes, parentheses, and mentions properly
- **Async Parsing**: `parse()` method now returns `Promise<ParsedCommand | null>`

### 🚀 **New Features**
- **Discord Mentions**: Parse `<@123>`, `<#456>`, `<@&789>` as structured objects
- **Aliases**: Support for command and subcommand aliases in schemas
- **Custom Types**: Extensible argument types with async validators
- **Enhanced Coercion**: Automatic array detection from comma-separated values
- **Better Error Recovery**: Detailed errors with positions and suggestions

### 🔧 **Key Fixes**
- **Debug**: Updated debug log format
- **Array Handling**: Fixed tokenizer to not split on spaces inside parentheses (e.g., `mentions(1, 2, 3)` now works correctly)
- **Case Sensitivity**: Added command-level case sensitivity when configured
- **Validation**: Improved schema validation with async support and better error messages

### 💥 **Breaking Changes**
- `parse()` is now async
- Result includes `mentions`, `resolvedCommand`, `resolvedSubcommands` fields
- Enhanced error object structure