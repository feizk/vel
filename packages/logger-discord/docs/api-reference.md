# API Reference 📖

Complete reference for all public APIs in `@feizk/logger-discord`.

---

## Table of Contents

- [DiscordTransport](#discordtransport)
- [Types](#types)
- [Constants](#constants)
- [CircuitBreaker](#circuitbreaker)
- [PersistentQueue](#persistentqueue)

---

## DiscordTransport

Main class for sending logs to Discord.

### Constructor

```typescript
new DiscordTransport(options: DiscordTransportOptions)
```

Creates a new Discord transport instance.

**Parameters:**

| Parameter         | Type                       | Required | Description                                 |
| ----------------- | -------------------------- | -------- | ------------------------------------------- |
| `webhookURL`      | `string`                   | Yes      | Discord webhook URL                         |
| `username`        | `string`                   | No       | Username to display (default: `'Logger'`)   |
| `avatarURL`       | `string`                   | No       | Avatar URL for webhook                      |
| `level`           | `LogLevel`                 | No       | Minimum log level (default: `'info'`)       |
| `formatter`       | `function`                 | No       | Custom formatter function                   |
| `levelColors`     | `Record<LogLevel, number>` | No       | Custom colors per level                     |
| `includeContext`  | `boolean`                  | No       | Include context in embeds (default: `true`) |
| `customPayload`   | `function`                 | No       | Complete payload override                   |
| `batching`        | `BatchingOptions`          | No       | Batching configuration                      |
| `compression`     | `CompressionOptions`       | No       | Compression configuration                   |
| `circuitBreaker`  | `CircuitBreakerOptions`    | No       | Circuit breaker config                      |
| `persistentQueue` | `PersistentQueueOptions`   | No       | Persistent queue config                     |

### Methods

#### log(entry: LogEntry): Promise<void>

Sends a log entry to Discord. Implements batching logic.

**Parameters:**

- `entry` - The log entry object from `@feizk/logger`

**Returns:** `Promise<void>`

**Note:** This method respects the configured log level threshold. Entries below the threshold are ignored.

#### destroy(): Promise<void>

Cleans up resources, flushes pending logs, and closes connections.

**Returns:** `Promise<void>` - Resolves when cleanup is complete

**Usage:**

```typescript
await transport.destroy();
```

---

## Types

### DiscordTransportOptions

Configuration options for DiscordTransport.

```typescript
interface DiscordTransportOptions {
  webhookURL: string;
  username?: string;
  avatarURL?: string;
  level?: LogLevel;
  formatter?: (entry: {
    level: LogLevel;
    timestamp: string;
    args: unknown[];
    prefix?: string;
    context: Record<string, unknown>;
  }) => string;
  levelColors?: Record<LogLevel, number>;
  includeContext?: boolean;
  customPayload?: (entry: {
    level: LogLevel;
    timestamp: string;
    args: unknown[];
    prefix?: string;
    context: Record<string, unknown>;
  }) => DiscordWebhookPayload;
  batching?: BatchingOptions;
  compression?: CompressionOptions;
  circuitBreaker?: CircuitBreakerOptions;
  persistentQueue?: PersistentQueueOptions;
}
```

### DiscordWebhookPayload

Discord webhook message payload structure.

```typescript
interface DiscordWebhookPayload {
  username?: string;
  avatar_url?: string;
  content?: string;
  embeds?: DiscordEmbed[];
}
```

### DiscordEmbed

Discord embed object.

```typescript
interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  thumbnail?: {
    url: string;
  };
  footer?: {
    text: string;
    icon_url?: string;
  };
  fields?: DiscordEmbedField[];
}
```

### DiscordEmbedField

Field within a Discord embed.

```typescript
interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}
```

### BatchingOptions

Batching configuration.

```typescript
interface BatchingOptions {
  enabled?: boolean;
  debounceMs?: number;
  maxBatchSize?: number;
  immediateFlushLevels?: LogLevel[];
}
```

### CompressionOptions

Compression configuration for large contexts.

```typescript
interface CompressionOptions {
  enabled?: boolean;
  threshold?: number;
}
```

### CircuitBreakerOptions

Circuit breaker configuration.

```typescript
interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  successThreshold?: number;
}
```

### PersistentQueueOptions

Persistent queue configuration.

```typescript
interface PersistentQueueOptions {
  storage: 'memory' | 'file';
  filePath?: string;
  maxSize?: number;
  maxRetries?: number;
  flushIntervalMs?: number;
}
```

### QueuePriority

Priority levels for queued messages.

```typescript
type QueuePriority = 'low' | 'normal' | 'high' | 'critical';
```

### QueuedMessage

Structure of a message in the persistent queue.

```typescript
interface QueuedMessage {
  id: string;
  payload: unknown;
  retryCount: number;
  timestamp: number;
  priority: QueuePriority;
}
```

---

## Constants

### DEFAULT_LEVEL_COLORS

Default color mapping for log levels.

```typescript
export const DEFAULT_LEVEL_COLORS: Record<LogLevel, number> = {
  trace: 0x95a5a6, // Gray
  debug: 0x3498db, // Blue
  info: 0x2ecc71, // Green
  warn: 0xf1c40f, // Yellow
  error: 0xe74c3c, // Red
  fatal: 0x8e44ad, // Purple
};
```

### DEFAULT_MIN_LEVEL

Default minimum log level.

```typescript
export const DEFAULT_MIN_LEVEL: LogLevel = 'info';
```

### DEFAULT_BATCHING_OPTIONS

Default batching configuration.

```typescript
export const DEFAULT_BATCHING_OPTIONS: Required<BatchingOptions> = {
  enabled: true,
  debounceMs: 1000,
  maxBatchSize: 10,
  immediateFlushLevels: ['error', 'fatal'],
};
```

### DEFAULT_COMPRESSION_OPTIONS

Default compression configuration.

```typescript
export const DEFAULT_COMPRESSION_OPTIONS: Required<CompressionOptions> = {
  enabled: true,
  threshold: 1024,
};
```

### DEFAULT_CIRCUIT_BREAKER_OPTIONS

Default circuit breaker configuration.

```typescript
export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: Required<CircuitBreakerOptions> =
  {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    successThreshold: 1,
  };
```

### DEFAULT_PERSISTENT_QUEUE_OPTIONS

Default persistent queue configuration.

```typescript
export const DEFAULT_PERSISTENT_QUEUE_OPTIONS: Required<PersistentQueueOptions> =
  {
    storage: 'memory',
    filePath: '.vel/discord-queue.json',
    maxSize: 10000,
    maxRetries: 5,
    flushIntervalMs: 5000,
  };
```

---

## CircuitBreaker

Circuit breaker implementation for preventing cascade failures.

### Constructor

```typescript
new CircuitBreaker(options?: CircuitBreakerOptions)
```

**Parameters:**

| Parameter          | Type     | Default | Description                     |
| ------------------ | -------- | ------- | ------------------------------- |
| `failureThreshold` | `number` | `5`     | Failures before opening circuit |
| `resetTimeoutMs`   | `number` | `30000` | Time before half-open (ms)      |
| `successThreshold` | `number` | `1`     | Successes to close circuit      |

### Methods

#### getState(): CircuitState

Get the current circuit state.

**Returns:** `CircuitState` - One of `'CLOSED'`, `'OPEN'`, `'HALF_OPEN'`

#### canExecute(): boolean

Check if requests can be executed.

**Returns:** `boolean` - `true` if circuit is not open

#### isOpen(): boolean

Check if circuit is currently open.

**Returns:** `boolean` - `true` if open

#### recordSuccess(): void

Record a successful request.

#### recordFailure(): void

Record a failed request.

#### getFailureCount(): number

Get consecutive failure count.

**Returns:** `number`

#### getTimeSinceLastFailure(): number | undefined

Get time since last failure in milliseconds.

**Returns:** `number | undefined`

#### forceState(state: CircuitState): void

Force circuit to a specific state (useful for testing).

**Parameters:**

- `state` - Target state

#### destroy(): void

Clean up resources.

---

## CircuitState

Enum for circuit states.

```typescript
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing fast
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}
```

---

## PersistentQueue

Persistent queue for storing failed messages with priority support.

### Constructor

```typescript
new PersistentQueue(options: PersistentQueueOptions)
```

**Parameters:**

| Parameter         | Type                 | Default                     | Description               |
| ----------------- | -------------------- | --------------------------- | ------------------------- |
| `storage`         | `'memory' \| 'file'` | Required                    | Storage backend           |
| `filePath`        | `string`             | `'.vel/discord-queue.json'` | File path for persistence |
| `maxSize`         | `number`             | `10000`                     | Maximum queue size        |
| `maxRetries`      | `number`             | `5`                         | Max retry attempts        |
| `flushIntervalMs` | `number`             | `5000`                      | File flush interval       |

### Methods

#### enqueue(payload: unknown, priority?: QueuePriority): Promise<void>

Add a message to the queue.

**Parameters:**

- `payload` - Message payload
- `priority` - Priority level (default: `'normal'`)

**Returns:** `Promise<void>`

#### dequeue(): QueuedMessage | undefined

Remove and return the highest priority message.

**Returns:** `QueuedMessage | undefined`

#### peek(): QueuedMessage | undefined

View the highest priority message without removing.

**Returns:** `QueuedMessage | undefined`

#### requeue(message: QueuedMessage): boolean

Requeue a failed message for retry.

**Parameters:**

- `message` - Message to requeue

**Returns:** `boolean` - `true` if requeued, `false` if dropped (max retries exceeded)

#### get size: number

Get current queue size.

**Returns:** `number`

#### isEmpty(): boolean

Check if queue is empty.

**Returns:** `boolean`

#### getAll(): QueuedMessage[]

Get all messages in queue (for debugging).

**Returns:** `QueuedMessage[]`

#### clear(): void

Remove all messages from queue.

#### destroy(): Promise<void>

Clean up resources and persist final state.

**Returns:** `Promise<void>`

---

## QueuePriority

Priority levels (in order from highest to lowest):

```typescript
type QueuePriority = 'critical' | 'high' | 'normal' | 'low';
```

**Automatic mapping:**

- `fatal` → `critical`
- `error` → `high`
- `warn` → `normal`
- `info`/`debug`/`trace` → `low`

---

## Related

- [Getting Started Guide](./getting-started.md) - Learn the basics
- [Configuration Options](./configuration.md) - Detailed option reference
- [Advanced Features](./advanced-features.md) - Circuit breaker, queue, and more
