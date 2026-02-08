# @feizk/logger

A lightweight, pluggable logger with colored outputs, structured logging, and transport support.

## Features

- 🚀 **Zero dependencies** - No external runtime dependencies
- 🎨 **Colored output** - ANSI color codes for terminal output
- 📊 **6 log levels** - trace, debug, info, warn, error, fatal
- 📝 **Structured logging** - JSON mode for production environments
- 🔌 **Pluggable transports** - Add custom transports (files, databases, etc.)
- 👶 **Child loggers** - Create prefixed loggers with merged context
- ⏱️ **Custom timestamps** - Presets (iso, locale) or custom format
- 🎯 **Type-safe** - Full TypeScript support

## Installation

```bash
npm install @feizk/logger
```

## Usage

```typescript
import { Logger } from '@feizk/logger';

const logger = new Logger();

logger.info('Hello, world!');
logger.warn('This is a warning');
logger.error('This is an error');
logger.debug('Debug information');
logger.trace('Very detailed trace');
logger.fatal('Critical error!');
```

## Options

| Option         | Type                                                           | Default     | Description                  |
| -------------- | -------------------------------------------------------------- | ----------- | ---------------------------- |
| `level`        | `'trace' \| 'debug' \| 'info' \| 'warn' \| 'error' \| 'fatal'` | `'debug'`   | Minimum log level to output  |
| `silent`       | `boolean`                                                      | `false`     | Suppress all console output  |
| `enableColors` | `boolean`                                                      | `true`      | Enable colored output        |
| `timestamp`    | `'iso' \| 'locale' \| (date: Date) => string`                  | `'iso'`     | Timestamp format             |
| `json`         | `boolean`                                                      | `false`     | Output logs as JSON          |
| `formatter`    | `(entry: LogEntry) => string`                                  | `undefined` | Custom log formatter         |
| `transports`   | `Transport[]`                                                  | `[]`        | Initial transports to attach |
| `prefix`       | `string`                                                       | `undefined` | Prefix for all log messages  |
| `context`      | `Record<string, unknown>`                                      | `{}`        | Initial context metadata     |

## API

### Logger Methods

- `trace(...args)` - Log a trace message (most verbose)
- `debug(...args)` - Log a debug message
- `info(...args)` - Log an info message
- `warn(...args)` - Log a warning message
- `error(...args)` - Log an error message
- `fatal(...args)` - Log a fatal message (most severe)
- `setLevel(level)` - Set the minimum log level
- `getLevel()` - Get the current log level
- `addTransport(transport)` - Add a custom transport
- `removeTransport(transport)` - Remove a transport
- `child(options)` - Create a child logger
- `destroy()` - Destroy the logger and all transports

### Log Levels

Logs are filtered by severity. The order from least to most severe:

1. `trace` - Very detailed debugging information
2. `debug` - Detailed information for debugging
3. `info` - General informational messages
4. `warn` - Warning conditions
5. `error` - Error conditions
6. `fatal` - Critical errors

## Advanced Usage

### Custom Timestamp

```typescript
const logger = new Logger({
  timestamp: 'locale', // or 'iso' (default)
});

// Custom format
const logger = new Logger({
  timestamp: (date) => date.toISOString(),
});
```

### Custom Formatter

```typescript
const logger = new Logger({
  formatter: (entry) =>
    `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.args.join(' ')}`,
});
```

### JSON Structured Logging

```typescript
const logger = new Logger({ json: true });
logger.info('User logged in', { userId: '123' });
// Output: {"level":"info","timestamp":"2024-01-01T00:00:00.000Z","message":"User logged in","context":{"userId":"123"}}
```

### Child Logger

```typescript
const parent = new Logger({ prefix: 'app', context: { version: '1.0.0' } });

const child = parent.child({
  prefix: 'api',
  context: { endpoint: '/users' },
});

child.info('Request received');
// Output includes prefix "app:api" and merged context
```

### Pluggable Transports

```typescript
import { Logger, type Transport, type LogEntry } from '@feizk/logger';

// Create a custom transport
class FileTransport implements Transport {
  private stream: WriteStream;

  constructor(path: string) {
    this.stream = createWriteStream(path);
  }

  log(entry: LogEntry): void {
    this.stream.write(JSON.stringify(entry) + '\n');
  }

  destroy(): void {
    this.stream.end();
  }
}

// Use the transport
const logger = new Logger();
logger.addTransport(new FileTransport('/var/log/app.log'));
logger.info('This will be logged to the file');
```

## Migration from v1.x

### Discord Transport

Discord transport has been moved to a separate package. Use `@feizk/logger-discord` instead:

```typescript
// v1.x
const logger = new Logger({
  discord: { enable: true, webhookURL: '...' },
});

// v2.x
import { Logger } from '@feizk/logger';
import { DiscordTransport } from '@feizk/logger-discord';

const logger = new Logger();
logger.addTransport(new DiscordTransport({ webhookURL: '...' }));
```

### Removed Options

- `discord` - Use `@feizk/logger-discord` instead
- `formatTimestamp` - Use `timestamp` instead
- `formatLog` - Use `formatter` instead

## License

MIT
