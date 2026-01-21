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

const result = parser.parse(
  '!help filter category name(general) status(active)',
);

if (result) {
  console.log(result.command); // 'help'
  console.log(result.subcommands); // ['filter', 'category']
  console.log(result.args); // { name: 'general', status: 'active' }
  console.log(result.prefixUsed); // '!'
}
```

### With Multiple Prefixes

```typescript
const parser = new Parser({ prefix: ['!', '?'] });

const result = parser.parse('?help');
console.log(result?.prefixUsed); // '?'
```

### Case Insensitive

```typescript
const parser = new Parser({ prefix: '!', caseSensitive: false });

const result = parser.parse('!HELP');
console.log(result?.command); // 'HELP'
```

### Custom Delimiter

```typescript
const parser = new Parser({ prefix: '!', delimiter: ',' });

const result = parser.parse('!help,filter,category,name(general)');
console.log(result?.subcommands); // ['filter', 'category']
console.log(result?.args); // { name: 'general' }
```

### With Equals Format

```typescript
const parser = new Parser({ prefix: '!', argFormat: 'equals' });

const result = parser.parse('!help filter category count=5 enabled=true name=general');
console.log(result?.args); // { count: 5, enabled: true, name: 'general' }
```

### With Named Format

```typescript
const parser = new Parser({ prefix: '!', argFormat: 'named' });

const result = parser.parse(
  '!help filter category --count 5 --enabled true --name general',
);
console.log(result?.args); // { count: 5, enabled: true, name: 'general' }
```

### Custom Error Messages

```typescript
const parser = new Parser({
  prefix: '!',
  errorMessages: {
    invalidArgFormat: 'Oops! "{part}" is not a valid argument',
    invalidNamedArg: 'Bad named arg "{part}" found at position {index}',
    prefixRequired: 'You forgot to set a prefix!',
  },
});

const result = parser.parse('!help invalidArg');
console.log(result?.errors); // ['Oops! "invalidArg" is not a valid argument']
```

## API

### ParserOptions

- `prefix`: `string | string[]` - The prefix(es) to match. Required.
- `caseSensitive?`: `boolean` - Whether prefix matching is case sensitive. Default: `false`.
- `delimiter?`: `string` - The delimiter to split arguments. Default: `' '`.
- `argFormat?`: `'typed' | 'equals' | 'named'` - The format for arguments. Options: 'typed' for `type(value)`, 'equals' for `key=value`, 'named' for `--key value`. Default: `'typed'`.
- `errorMessages?`: `{ prefixRequired?, invalidArgFormat?, invalidNamedArg? }` - Custom error message templates. Supports placeholders `{part}` and `{index}`. Default messages provided if not specified.

### ParsedCommand

- `prefixUsed`: `string` - The prefix that was matched.
- `command`: `string` - The command name.
- `subcommands`: `string[]` - The subcommands before typed arguments.
- `args`: `Record<string, unknown>` - The typed arguments as key-value pairs, with automatic type coercion (numbers, booleans, strings).
- `originalMessage`: `string` - The original message.
- `errors?`: `string[]` - Any parsing errors, if present.

### Parser

- `constructor(options: ParserOptions)`
- `parse(message: string): ParsedCommand | null` - Parses the message. Returns `null` if no prefix matches or invalid message.

## Type Coercion

The parser automatically coerces argument values to their appropriate types:

- Strings that represent numbers (e.g., "5", "3.14") are converted to numbers.
- "true" and "false" are converted to booleans.
- Other values remain as strings.

```typescript
const result = parser.parse('!help count(5) enabled(true) name(John)');
// result.args: { count: 5, enabled: true, name: 'John' }
```

## Argument Formats

The parser supports different argument formats, configurable via `argFormat`:

- **typed** (default): `type(value)`, e.g., `name(general)`
- **equals**: `key=value`, e.g., `name=general`
- **named**: `--key value`, e.g., `--name general`

The parser splits the message by the delimiter, identifies the command, collects subcommands until an argument in the specified format is found, and parses arguments into an object. Invalid formats are rejected.
