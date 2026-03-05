# @feizk/logger-discord

Discord transport plugin for [@feizk/logger](https://www.npmjs.com/package/@feizk/logger).

## Installation

```bash
npm install @feizk/logger @feizk/logger-discord
```

## Usage

```typescript
import { Logger } from '@feizk/logger';
import { DiscordTransport } from '@feizk/logger-discord';

const logger = new Logger();

logger.addTransport(
  new DiscordTransport({
    webhookURL:
      'https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz',
  }),
);

logger.info('Hello Discord!');
logger.error('Something went wrong', { errorCode: 500 });
```

## Options

| Option            | Type                       | Default     | Description                          |
| ----------------- | -------------------------- | ----------- | ------------------------------------ |
| `webhookURL`      | `string`                   | (required)  | Discord webhook URL                  |
| `username`        | `string`                   | `'Logger'`  | Username to display in Discord       |
| `avatarURL`       | `string`                   | `undefined` | Avatar URL for the webhook           |
| `level`           | `LogLevel`                 | `'info'`    | Minimum log level to send to Discord |
| `formatter`       | `function`                 | `undefined` | Custom formatter function            |
| `levelColors`     | `Record<LogLevel, number>` | see below   | Custom colors for each log level     |
| `includeContext`  | `boolean`                  | `true`      | Whether to include context in embeds |
| `customPayload`   | `function`                 | `undefined` | Custom payload builder function      |
| `batching`        | `BatchingOptions`          | see below   | Batching configuration               |
| `compression`     | `CompressionOptions`       | see below   | Compression configuration            |
| `circuitBreaker`  | `CircuitBreakerOptions`    | `undefined` | Circuit breaker configuration        |
| `persistentQueue` | `PersistentQueueOptions`   | `undefined` | Persistent queue configuration       |

### Batching Options

Batching reduces API calls by accumulating logs and sending them together:

| Option                 | Type         | Default              | Description                                  |
| ---------------------- | ------------ | -------------------- | -------------------------------------------- |
| `enabled`              | `boolean`    | `true`               | Enable log batching                          |
| `debounceMs`           | `number`     | `1000`               | Delay before sending non-critical logs (ms)  |
| `maxBatchSize`         | `number`     | `10`                 | Maximum logs per message (Discord limit: 10) |
| `immediateFlushLevels` | `LogLevel[]` | `['error', 'fatal']` | Levels that trigger immediate flush          |

### Compression Options

Compression handles large context objects:

| Option      | Type      | Default | Description                                  |
| ----------- | --------- | ------- | -------------------------------------------- |
| `enabled`   | `boolean` | `true`  | Enable compression for large contexts        |
| `threshold` | `number`  | `1024`  | Size threshold in characters for compression |

### Default Level Colors

- `trace`: Gray (0x95a5a6)
- `debug`: Blue (0x3498db)
- `info`: Green (0x2ecc71)
- `warn`: Yellow (0xf1c40f)
- `error`: Red (0xe74c3c)
- `fatal`: Purple (0x8e44ad)

## Log Levels

The transport respects the log level threshold. By default, only `info`, `warn`, `error`, and `fatal` levels are sent to Discord. You can customize this:

```typescript
// Send all logs to Discord
const transport = new DiscordTransport({
  webhookURL: '...',
  level: 'trace',
});

// Only send errors and fatal
const transport = new DiscordTransport({
  webhookURL: '...',
  level: 'error',
});
```

## Custom Formatting

### Custom Formatter

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  formatter: ({ level, timestamp, args, prefix, context }) => {
    const prefixStr = prefix ? `[${prefix}] ` : '';
    return `**${level.toUpperCase()}** ${prefixStr}${args.join(' ')}`;
  },
});
```

### Custom Payload

For advanced use cases, you can completely override the Discord webhook payload:

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  customPayload: ({ level, args, context }) => ({
    content: `New log: ${args.join(' ')}`,
    embeds: [
      {
        title: `Log Level: ${level}`,
        description: args.join(' '),
        color: level === 'error' ? 0xff0000 : 0x00ff00,
      },
    ],
  }),
});
```

## TypeScript

This package is written in TypeScript and includes type definitions. The transport is fully typed:

```typescript
import type { LogLevel } from '@feizk/logger';

const transport = new DiscordTransport({
  webhookURL: 'https://discord.com/api/webhooks/...',
  level: 'warn' satisfies LogLevel,
});
```

## Batching & Performance

### Multi-Log Batching

Discord supports up to 10 embeds per message. The transport automatically batches logs:

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  batching: {
    enabled: true,
    debounceMs: 1000, // Wait 1 second for non-critical logs
    maxBatchSize: 10, // Discord limit
    immediateFlushLevels: ['error', 'fatal'],
  },
});

// These logs will be batched into a single API call
logger.info('Log 1');
logger.info('Log 2');
logger.debug('Log 3');

// Error logs flush immediately
logger.error('Critical error!');
```

**Benefits:**

- Reduces API calls by ~90%
- Respects Discord rate limits
- Critical logs (error/fatal) are sent immediately
- Remaining logs are flushed on application shutdown

### Message Compression

Large context objects are automatically compressed to stay within Discord's limits:

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  compression: {
    enabled: true,
    threshold: 1024,  // Compress contexts larger than 1024 characters
  },
});

// Large context will be truncated with "(truncated)" indicator
logger.info('Large data', {
  hugeObject: /* ...very large data... */
});
```

### Disabling Batching

For immediate delivery (e.g., in development):

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  batching: { enabled: false },
});
```

## Advanced Reliability Features

### Circuit Breaker

The circuit breaker prevents overwhelming Discord's API during outages. After 5 consecutive failures (configurable), the circuit opens and requests are temporarily rejected for 30 seconds:

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  circuitBreaker: {
    failureThreshold: 5,    // Open circuit after 5 failures
    resetTimeoutMs: 30000,  // Try again after 30 seconds
    successThreshold: 1,    // Close circuit after 1 success
  },
});
```

**Circuit States:**

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Failing fast, requests are rejected to prevent hammering
- **HALF_OPEN**: Testing recovery with limited requests

### Persistent Queue

For critical logs that must not be lost, enable the persistent queue. Failed messages are stored and automatically retried:

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  persistentQueue: {
    storage: 'file',                 // 'memory' or 'file'
    filePath: '.vel/discord-queue.json',  // File path for persistence
    maxSize: 10000,                  // Maximum queue size
    maxRetries: 5,                   // Retry failed messages 5 times
    flushIntervalMs: 5000,           // Flush to disk every 5 seconds
  },
});
```

**Priority Levels:**

Messages are automatically prioritized based on log level:

- `fatal` → `critical` priority
- `error` → `high` priority
- `warn` → `normal` priority
- `info/debug/trace` → `low` priority

**Combining Circuit Breaker + Persistent Queue:**

For maximum reliability, combine both features:

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
  },
  persistentQueue: {
    storage: 'file',
    filePath: '.vel/discord-queue.json',
    maxSize: 10000,
    maxRetries: 5,
  },
});

// When Discord is down:
// 1. Circuit breaker opens after 5 failures
// 2. Messages are queued to disk with priority
// 3. When circuit closes, queued messages are retried
// 4. Critical logs (fatal/error) are processed first
```

## Example Embed Output

```
[INFO] Hello Discord!
```

Would produce a Discord embed with:

- Description: **INFO** Hello Discord!
- Color: Green (0x2ecc71)
- Timestamp: Current time

## License

MIT
