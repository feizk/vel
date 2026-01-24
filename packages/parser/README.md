# @feizk/parser

A flexible package to parse messages for commands and arguments with configurable prefixes, schema validation, and command history.

## Installation

```bash
npm install @feizk/parser
```

## Usage

```typescript
import { Parser } from '@feizk/parser';

const parser = new Parser({ prefix: '!' });

// Basic parsing
const result = parser.parse('!help filter category name(general) status(active)');

if (result) {
  console.log(result.command); // 'help'
  console.log(result.subcommands); // ['filter', 'category']
  console.log(result.args); // { name: 'general', status: 'active' }
  console.log(result.errors); // parsing errors, if any
  console.log(result.validationErrors); // schema validation errors, if any
}

// Retrieve last parsed command
const lastParsed = parser.getLastParsed();
console.log(lastParsed); // The last ParsedCommand or null
```

### Schema Validation

Register schemas to validate commands, subcommands, and arguments:

```typescript
parser.registerSchema('help', {
  allowedSubcommands: ['filter', 'category'],
  args: {
    name: { type: 'string', required: true },
    count: { type: 'number' },
    active: { type: 'boolean' },
  },
});

parser.registerSchema('info', {
  allowedSubcommands: ['general'],
  args: {
    category: { type: 'string' }, // global: optional string
  },
  subArgs: {
    general: {
      category: { type: 'string', required: true }, // required when subcommand 'general'
    },
  },
});

// Now parsing will validate against the schema
const result = parser.parse('!help filter name(test) count(5) active(true)');
if (result?.validationErrors) {
  console.log('Validation errors:', result.validationErrors);
}

// For info command:
// - category is optional globally
// - category is required (and must be string) when subcommand 'general' is present
const result2 = parser.parse('!info general'); // validationErrors: category required
const result3 = parser.parse('!info general category=general'); // no errors
const result4 = parser.parse('!info category=general'); // no errors (global optional)
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
- `registerSchema(command: string, schema: CommandSchema): void`
- `getLastParsed(): ParsedCommand | null`

### Types

- `ParsedCommand`: Includes `prefixUsed`, `command`, `subcommands`, `args`, `originalMessage`, `errors?`, `validationErrors?`
- `CommandSchema`: Defines `allowedSubcommands?` and `args?` for validation
