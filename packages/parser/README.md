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

const result = await parser.parse('!help filter name(test) <@123>');

if (result) {
  console.log(result.command); // 'help'
  console.log(result.subcommands); // ['filter']
  console.log(result.args); // { name: 'test' }
  console.log(result.mentions); // [{ type: 'user', id: '123' }]
}
```

## Options

| Option          | Type                             | Default   | Description                           |
| --------------- | -------------------------------- | --------- | ------------------------------------- |
| `prefix`        | `string \| string[]`             | -         | **Required.** The prefix(es) to match |
| `caseSensitive` | `boolean`                        | `false`   | Case sensitivity for prefix matching  |
| `delimiter`     | `string`                         | `' '`     | Argument delimiter                    |
| `argFormat`     | `'typed' \| 'equals' \| 'named'` | `'typed'` | Argument format style                 |
| `debug`         | `boolean`                        | `false`   | Enable debug logging                  |

## Argument Formats

- **typed**: `key(value)`
- **equals**: `key=value`
- **named**: `--key value`

## Schema Validation

Supports schema validation for commands and arguments. Use `registerSchema()` to define validation rules.

## License

MIT
