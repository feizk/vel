# Configuration Options ⚙️

Complete reference for all configuration options in `@feizk/logger-discord`.

---

## Table of Contents

- [Overview](#overview)
- [Basic Options](#basic-options)
- [Styling Options](#styling-options)
- [Batching Options](#batching-options)
- [Compression Options](#compression-options)
- [Circuit Breaker Options](#circuit-breaker-options)
- [Persistent Queue Options](#persistent-queue-options)

---

## Overview

The `DiscordTransport` constructor accepts a `DiscordTransportOptions` object with the following structure:

```typescript
interface DiscordTransportOptions {
  // Basic
  webhookURL: string;
  username?: string;
  avatarURL?: string;
  level?: LogLevel;
  includeContext?: boolean;

  // Styling
  formatter?: (entry) => string;
  levelColors?: Record<LogLevel, number>;
  customPayload?: (entry) => DiscordWebhookPayload;

  // Advanced
  batching?: BatchingOptions;
  compression?: CompressionOptions;
  circuitBreaker?: CircuitBreakerOptions;
  persistentQueue?: PersistentQueueOptions;
}
```

---

## Basic Options

### webhookURL ⚠️ Required

**Type:** `string`

Discord webhook URL. Get this from Discord channel settings → Integrations → Webhooks.

```typescript
new DiscordTransport({
  webhookURL: 'https://discord.com/api/webhooks/ID/TOKEN',
});
```

### username

**Type:** `string`  
**Default:** `'Logger'`

Username displayed in Discord messages.

```typescript
new DiscordTransport({
  webhookURL: '...',
  username: 'My App Logs',
});
```

### avatarURL

**Type:** `string`  
**Default:** `undefined`

URL for the webhook avatar/icon.

```typescript
new DiscordTransport({
  webhookURL: '...',
  avatarURL: 'https://example.com/logo.png',
});
```

### level

**Type:** `LogLevel`  
**Default:** `'info'`

Minimum log level to send to Discord. Levels in order: `trace` < `debug` < `info` < `warn` < `error` < `fatal`.

```typescript
new DiscordTransport({
  webhookURL: '...',
  level: 'warn', // Only warn, error, fatal
});

new DiscordTransport({
  webhookURL: '...',
  level: 'debug', // debug, info, warn, error, fatal
});
```

### includeContext

**Type:** `boolean`  
**Default:** `true`

Whether to include the log context object in the embed as a separate field.

```typescript
new DiscordTransport({
  webhookURL: '...',
  includeContext: false, // Don't show context
});

logger.info('User action', { userId: 123, action: 'login' });
// With includeContext: true → Context field added
// With includeContext: false → Context not shown
```

---

## Styling Options

### formatter

**Type:** `(entry: { level: LogLevel, timestamp: string, args: unknown[], prefix?: string, context: Record<string, unknown> }) => string`  
**Default:** `undefined`

Custom function to format the log message. Overrides the default formatter.

**Entry object:**

```typescript
{
  level: 'info' | 'warn' | 'error' | 'fatal' | 'debug' | 'trace';
  timestamp: string; // ISO timestamp
  args: unknown[]; // Original log arguments
  prefix?: string; // Optional prefix from logger
  context: Record<string, unknown>; // Context object
}
```

**Example:**

```typescript
new DiscordTransport({
  webhookURL: '...',
  formatter: ({ level, timestamp, args, prefix }) => {
    const time = new Date(timestamp).toLocaleTimeString();
    const prefixStr = prefix ? `[${prefix}]` : '';
    return `${time} [${level.toUpperCase()}] ${prefixStr} ${args.join(' ')}`;
  },
});
```

### levelColors

**Type:** `Record<LogLevel, number>`  
**Default:** See [Default Colors](#default-level-colors)

Custom colors for each log level. Colors are decimal values (Discord uses decimal, not hex).

```typescript
new DiscordTransport({
  webhookURL: '...',
  levelColors: {
    trace: 0x808080, // Gray
    debug: 0x0000ff, // Blue
    info: 0x00ff00, // Green
    warn: 0xffff00, // Yellow
    error: 0xff0000, // Red
    fatal: 0x800080, // Purple
  },
});
```

#### Default Level Colors 🎨

| Level   | Color  | Decimal    |
| ------- | ------ | ---------- |
| `trace` | Gray   | `0x95a5a6` |
| `debug` | Blue   | `0x3498db` |
| `info`  | Green  | `0x2ecc71` |
| `warn`  | Yellow | `0xf1c40f` |
| `error` | Red    | `0xe74c3c` |
| `fatal` | Purple | `0x8e44ad` |

### customPayload

**Type:** `(entry: { level: LogLevel, timestamp: string, args: unknown[], prefix?: string, context: Record<string, unknown> }) => DiscordWebhookPayload`  
**Default:** `undefined`

Complete override for the Discord webhook payload. Use this for full control over the message format.

**Returns:** `DiscordWebhookPayload` object

```typescript
interface DiscordWebhookPayload {
  username?: string;
  avatar_url?: string;
  content?: string;
  embeds?: DiscordEmbed[];
}
```

**Example:**

```typescript
new DiscordTransport({
  webhookURL: '...',
  customPayload: ({ level, args, context }) => ({
    content: level === 'error' ? `@everyone ${args[0]}` : undefined,
    embeds: [
      {
        title: `Log: ${level.toUpperCase()}`,
        description: args.join(' '),
        color: level === 'error' ? 0xff0000 : 0x2ecc71,
        fields: [
          {
            name: 'Timestamp',
            value: new Date().toISOString(),
            inline: true,
          },
          ...(context.userId
            ? [
                {
                  name: 'User',
                  value: `ID: ${context.userId}`,
                  inline: true,
                },
              ]
            : []),
        ],
      },
    ],
  }),
});
```

---

## Batching Options

Batching reduces API calls by accumulating multiple logs and sending them together. Discord allows up to 10 embeds per message.

### enabled

**Type:** `boolean`  
**Default:** `true`

Enable or disable batching.

```typescript
new DiscordTransport({
  webhookURL: '...',
  batching: {
    enabled: true, // Default
  },
});
```

### debounceMs

**Type:** `number`  
**Default:** `1000`

Delay in milliseconds before sending non-critical logs. This allows multiple logs to accumulate into a single batch.

```typescript
new DiscordTransport({
  webhookURL: '...',
  batching: {
    debounceMs: 2000, // Wait 2 seconds for batching
  },
});
```

**How it works:**

1. Log arrives → added to batch
2. Timer starts (debounceMs)
3. If another log arrives before timer ends, timer resets
4. When timer expires, batch is sent

### maxBatchSize

**Type:** `number`  
**Default:** `10`

Maximum number of logs per batch. Discord's hard limit is 10 embeds per message.

```typescript
new DiscordTransport({
  webhookURL: '...',
  batching: {
    maxBatchSize: 5, // Send batches of 5 (more frequent)
  },
});
```

### immediateFlushLevels

**Type:** `LogLevel[]`  
**Default:** `['error', 'fatal']`

Log levels that trigger immediate flush, bypassing the debounce delay.

```typescript
new DiscordTransport({
  webhookURL: '...',
  batching: {
    immediateFlushLevels: ['warn', 'error', 'fatal'], // Flush warnings immediately too
  },
});
```

**Complete batching example:**

```typescript
new DiscordTransport({
  webhookURL: '...',
  batching: {
    enabled: true,
    debounceMs: 1000,
    maxBatchSize: 10,
    immediateFlushLevels: ['error', 'fatal'],
  },
});
```

---

## Compression Options

Compression handles large context objects by truncating them to fit within Discord's limits.

### enabled

**Type:** `boolean`  
**Default:** `true`

Enable or disable compression.

```typescript
new DiscordTransport({
  webhookURL: '...',
  compression: {
    enabled: true, // Default
  },
});
```

### threshold

**Type:** `number`  
**Default:** `1024`

Size threshold in characters. Contexts larger than this are compressed/truncated.

```typescript
new DiscordTransport({
  webhookURL: '...',
  compression: {
    threshold: 2048, // Only compress contexts > 2KB
  },
});
```

**How it works:**

- Context is stringified to JSON
- If length > threshold, it's truncated
- `... (truncated)` indicator is appended
- Final value must fit in Discord's 1024-character field limit

---

## Circuit Breaker Options

Circuit breaker prevents overwhelming Discord's API during outages by temporarily rejecting requests after consecutive failures.

### failureThreshold

**Type:** `number`  
**Default:** `5`

Number of consecutive failures before opening the circuit.

```typescript
new DiscordTransport({
  webhookURL: '...',
  circuitBreaker: {
    failureThreshold: 3, // Open after 3 failures (more aggressive)
  },
});
```

### resetTimeoutMs

**Type:** `number`  
**Default:** `30000`

Time in milliseconds before attempting to close the circuit (half-open state).

```typescript
new DiscordTransport({
  webhookURL: '...',
  circuitBreaker: {
    resetTimeoutMs: 60000, // Wait 60 seconds before retry
  },
});
```

### successThreshold

**Type:** `number`  
**Default:** `1`

Number of successful requests required to fully close the circuit from half-open state.

```typescript
new DiscordTransport({
  webhookURL: '...',
  circuitBreaker: {
    successThreshold: 2, // Need 2 successes to close
  },
});
```

**Circuit states:**

```
CLOSED → (failures ≥ threshold) → OPEN
OPEN → (resetTimeoutMs elapsed) → HALF_OPEN
HALF_OPEN → (successes ≥ threshold) → CLOSED
HALF_OPEN → (failure) → OPEN
```

**Example:**

```typescript
new DiscordTransport({
  webhookURL: '...',
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    successThreshold: 1,
  },
});
```

---

## Persistent Queue Options

Persistent queue stores failed messages and automatically retries them. Supports both memory and file-based storage.

### storage

**Type:** `'memory' | 'file'`  
**Default:** `'memory'`

Storage backend for the queue.

```typescript
new DiscordTransport({
  webhookURL: '...',
  persistentQueue: {
    storage: 'file', // Persist to disk
  },
});
```

### filePath

**Type:** `string`  
**Default:** `'.vel/discord-queue.json'`

File path for file-based storage. Relative to current working directory.

```typescript
new DiscordTransport({
  webhookURL: '...',
  persistentQueue: {
    storage: 'file',
    filePath: './data/discord-queue.json',
  },
});
```

### maxSize

**Type:** `number`  
**Default:** `10000`

Maximum number of messages in the queue. When exceeded, oldest low-priority messages are removed.

```typescript
new DiscordTransport({
  webhookURL: '...',
  persistentQueue: {
    maxSize: 5000, // Smaller queue
  },
});
```

### maxRetries

**Type:** `number`  
**Default:** `5`

Maximum number of retry attempts for a failed message. After exceeding, the message is dropped.

```typescript
new DiscordTransport({
  webhookURL: '...',
  persistentQueue: {
    maxRetries: 3, // Fewer retries
  },
});
```

### flushIntervalMs

**Type:** `number`  
**Default:** `5000`

Interval in milliseconds for flushing queued messages to disk (file storage only).

```typescript
new DiscordTransport({
  webhookURL: '...',
  persistentQueue: {
    storage: 'file',
    flushIntervalMs: 10000, // Flush every 10 seconds
  },
});
```

**Complete persistent queue example:**

```typescript
new DiscordTransport({
  webhookURL: '...',
  persistentQueue: {
    storage: 'file',
    filePath: '.vel/discord-queue.json',
    maxSize: 10000,
    maxRetries: 5,
    flushIntervalMs: 5000,
  },
});
```

---

## Priority Mapping

Messages are automatically assigned priority based on log level:

| Log Level | Priority   |
| --------- | ---------- |
| `fatal`   | `critical` |
| `error`   | `high`     |
| `warn`    | `normal`   |
| `info`    | `low`      |
| `debug`   | `low`      |
| `trace`   | `low`      |

Higher priority messages are processed first when retrying from the queue.

---

## Next Steps

- See [Advanced Features](./advanced-features.md) for circuit breaker and queue usage patterns
- Check [API Reference](./api-reference.md) for complete type definitions
- Review [Getting Started](./getting-started.md) for basic setup
