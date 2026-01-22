# @feizk/parser

A flexible package to parse messages for commands and arguments with configurable prefixes.

## Installation

```bash
npm install @feizk/parser
```

## Usage

```typescript
import { Parser } from '@feizk/parser';

const parser = new Parser({ prefix: '!' });

const result = parser.parse('!help filter category name(general) status(active)');

if (result) {
  console.log(result.command); // 'help'
  console.log(result.subcommands); // ['filter', 'category']
  console.log(result.args); // { name: 'general', status: 'active' }
}
```

### Options

- `prefix`: `string | string[]` - Required. The prefix(es) to match.
- `caseSensitive?`: `boolean` - Case sensitivity for prefix matching. Default: `false`.
- `delimiter?`: `string` - Argument delimiter. Default: `' '`.
- `argFormat?`: `'typed' | 'equals' | 'named'` - Argument format. Default: `'typed'`.
- `errorMessages?`: Custom error messages.

### Argument Formats

- **typed**: `key(value)` or `key("multi word")`
- **equals**: `key=value` or `key="multi word"`
- **named**: `--key value` or `--key "multi word"`

## Type Coercion

Arguments are automatically coerced: strings like "5" to numbers, "true"/"false" to booleans.

## API

- `Parser(options: ParserOptions)`
- `parse(message: string): ParsedCommand | null`

ParsedCommand includes: `prefixUsed`, `command`, `subcommands`, `args`, `originalMessage`, `errors?`.
