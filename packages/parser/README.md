# @feizk/parser

A flexible package to parse messages for commands and arguments with configurable prefixes, schema validation, and debug logging.

## Installation

```bash
npm install @feizk/parser
```

## Usage

```typescript
import { Parser } from '@feizk/parser';

const parser = new Parser({ prefix: '!' });

const result = parser.parse('!help filter name(test) status(active)');

if (result) {
  console.log(result.command); // 'help'
  console.log(result.subcommands); // ['filter']
  console.log(result.args); // { name: 'test', status: 'active' }
}
```

## Options

| Option          | Type                             | Default     | Description                           |
| --------------- | -------------------------------- | ----------- | ------------------------------------- |
| `prefix`        | `string \| string[]`             | -           | **Required.** The prefix(es) to match |
| `caseSensitive` | `boolean`                        | `false`     | Case sensitivity for prefix matching  |
| `delimiter`     | `string`                         | `' '`       | Argument delimiter                    |
| `argFormat`     | `'typed' \| 'equals' \| 'named'` | `'typed'`   | Argument format style                 |
| `debug`         | `DebugOptions`                   | `undefined` | Debug logging configuration           |

## Argument Formats

- **typed**: `key(value)` or `key("multi word")`
- **equals**: `key=value` or `key="multi word"`
- **named**: `--key value` or `--key "multi word"`

## Schema Validation

```typescript
parser.registerSchema('help', {
  allowedSubcommands: ['filter'],
  args: {
    name: { type: 'string', required: true, minLength: 3, maxLength: 50 },
    status: { type: 'string', allowedValues: ['active', 'inactive'] },
    age: { type: 'number', min: 0, max: 120 },
    createdAt: {
      type: 'date',
      min: '2020-01-01T00:00:00Z',
      max: '2030-01-01T00:00:00Z',
    },
    tags: { type: 'array', minItems: 1, maxItems: 10 },
    email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
  },
});

const result = parser.parse(
  '!help filter name(test) createdAt(2023-01-01T00:00:00Z) tags(a,b,c)',
);
// Validates against schema and returns validation errors if any
```

### Argument Validation Options

In addition to `type` and `required`, arguments can have the following validation properties:

- **String arguments**:
  - `minLength`: Minimum length
  - `maxLength`: Maximum length
  - `pattern`: Regex pattern to match
  - `allowedValues`: Array of allowed string values

- **Number arguments**:
  - `min`: Minimum value
  - `max`: Maximum value
  - `allowedValues`: Array of allowed number values

- **Date arguments**:
  - `min`: Minimum date (ISO string or timestamp)
  - `max`: Maximum date (ISO string or timestamp)
  - `allowedValues`: Array of allowed date values

- **Array arguments**:
  - `minItems`: Minimum number of items
  - `maxItems`: Maximum number of items
  - `allowedValues`: Array of allowed values (each item must be in this list)

- **All types**:
  - `allowedValues`: List of allowed values for the argument

## License

MIT
