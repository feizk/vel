# @feizk/logger

A simple logger package with colored outputs and timestamps.

## Installation

```bash
npm install @feizk/logger
```

## Usage

```typescript
import { Logger } from '@feizk/logger';

const logger = new Logger();

logger.info('This is an info message');
logger.warn('This is a warning');
logger.error('This is an error');
logger.debug('This is a debug message');
```

## Options

| Option          | Type                             | Default     | Description                           |
| --------------- | -------------------------------- | ----------- | ------------------------------------- |
| `enableColors`  | `boolean`                        | `true`      | Enable colored output                 |
| `formatTimestamp`| `function \| undefined`          | `ISO format`| Custom timestamp formatter function   |
| `formatLog`     | `function \| undefined`          | `undefined` | Custom log formatter function         |
| `level`         | `'debug' \| 'info' \| 'warn' \| 'error'` | `'debug'` | Minimum log level                     |
| `discord`       | `object \| undefined`            | `undefined` | Discord transport options             |

### Discord Options

The `discord` option configures Discord webhook integration. It has the following properties:

- `enable`: `boolean`, default `false` - Enable Discord transport
- `webhookURL`: `string`, default `''` - Discord webhook URL
- `formatEmbed`: `function \| undefined`, default `undefined` - Custom embed formatter function
- `batchSize`: `number`, default `10` - Number of embeds per batch request
- `batchDelay`: `number`, default `2000` - Delay in ms between batch sends
- `maxRetries`: `number`, default `3` - Maximum retry attempts for failed sends
- `retryDelayBase`: `number`, default `1000` - Base delay in ms for exponential backoff

## API

### Logger

- `info(...args: unknown[])`: Logs an info message.
- `warn(...args: unknown[])`: Logs a warning message.
- `error(...args: unknown[])`: Logs an error message.
- `debug(...args: unknown[])`: Logs a debug message.
- `setLevel(level: LogLevel)`: Sets the minimum log level for filtering messages.

All messages include a timestamp and are colored accordingly (unless disabled via options).

## License

MIT
