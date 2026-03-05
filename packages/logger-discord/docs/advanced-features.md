# Advanced Features 🛡️

Deep dive into advanced reliability features: Circuit Breaker, Persistent Queue, and best practices.

---

## Table of Contents

- [Circuit Breaker](#circuit-breaker)
- [Persistent Queue](#persistent-queue)
- [Combining Both Features](#combining-both-features)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Circuit Breaker

The circuit breaker pattern prevents cascade failures by temporarily stopping requests to a failing service.

### How It Works

```
     ┌─────────────┐
     │   CLOSED    │───(failures ≥ threshold)───┐
     └─────────────┘                            │
            │                                   │ (success)
            │ (success)                         │
            ▼                                   ▼
     ┌─────────────┐                    ┌─────────────┐
     │   CLOSED    │◄──(successes ≥ th)─┤ HALF_OPEN   │
     └─────────────┘                    └─────────────┘
            ▲                                   │
            │                                   │ (failure)
            │ (resetTimeoutMs elapsed)          │
            └───────────────────────────────────┘
```

**States:**

1. **CLOSED** ✅ - Normal operation, all requests pass through
2. **OPEN** 🚫 - Failing fast, requests are immediately rejected
3. **HALF_OPEN** 🔄 - Testing if service recovered, limited requests allowed

### Configuration

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  circuitBreaker: {
    failureThreshold: 5,    // Open after 5 consecutive failures
    resetTimeoutMs: 30000,  // Wait 30s before half-open
    successThreshold: 1,    // Close after 1 success in half-open
  },
});
```

### Usage Example

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
  },
});

// The circuit breaker works automatically
// You can inspect its state if needed:

import { CircuitBreaker } from '@feizk/logger-discord';

// Access the internal circuit breaker (if you need to monitor)
const breaker = (transport as any).circuitBreaker as CircuitBreaker;

console.log('Circuit state:', breaker.getState()); // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
console.log('Failure count:', breaker.getFailureCount());
```

### When to Use

✅ **Use circuit breaker when:**
- Discord API is unreliable or frequently rate-limited
- You want to prevent overwhelming Discord during outages
- You have other fallback mechanisms (like persistent queue)

❌ **Skip circuit breaker when:**
- You're in development/testing
- Discord API is highly reliable for your use case
- You want immediate failure feedback

---

## Persistent Queue

Persistent queue stores failed messages and automatically retries them. Supports both memory and file-based storage.

### How It Works

```
1. Message fails to send
   ↓
2. Check maxRetries
   ↓
3. If retries remain → enqueue with priority
   ↓
4. Periodic processing attempts to resend
   ↓
5. On success → remove from queue
   On failure → increment retry count, requeue
   ↓
6. If maxRetries exceeded → drop message
```

### Priority Levels

Messages are prioritized based on log level:

| Log Level | Priority | Order |
|-----------|----------|-------|
| `fatal` | `critical` | 1st |
| `error` | `high` | 2nd |
| `warn` | `normal` | 3rd |
| `info` | `low` | 4th |
| `debug` | `low` | 4th |
| `trace` | `low` | 4th |

Higher priority messages are processed first.

### Memory Storage

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  persistentQueue: {
    storage: 'memory', // Default
    maxSize: 10000,
    maxRetries: 5,
  },
});
```

**Pros:**
- Fast, no disk I/O
- Simple, no file management

**Cons:**
- Queue lost on app restart
- Not suitable for critical logs

### File Storage

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  persistentQueue: {
    storage: 'file',
    filePath: '.vel/discord-queue.json',
    maxSize: 10000,
    maxRetries: 5,
    flushIntervalMs: 5000, // Save to disk every 5s
  },
});
```

**Pros:**
- Survives app restarts
- Persistent log history
- Suitable for critical logs

**Cons:**
- Slower due to disk I/O
- Requires file system access
- Need to manage disk space

### Queue Management

```typescript
import { PersistentQueue } from '@feizk/logger-discord';

const queue = new PersistentQueue({
  storage: 'file',
  filePath: './queue.json',
});

// Enqueue with priority
await queue.enqueue(payload, 'high');

// Peek at next message
const next = queue.peek();

// Dequeue (remove and get)
const message = queue.dequeue();

// Requeue failed message
const success = queue.requeue(message);

// Check size
console.log('Queue size:', queue.size);

// Get all (for debugging)
const all = queue.getAll();

// Clear queue
queue.clear();

// Cleanup on shutdown
await queue.destroy();
```

### When to Use

✅ **Use persistent queue when:**
- Logs are critical and must not be lost
- Discord API is frequently unavailable
- You need to survive app restarts
- You want guaranteed delivery eventually

❌ **Skip persistent queue when:**
- Logs are non-critical
- Discord API is highly reliable
- You don't want disk writes
- Memory constraints are tight

---

## Combining Both Features

For maximum reliability, use both circuit breaker and persistent queue together.

### Configuration

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    successThreshold: 1,
  },
  persistentQueue: {
    storage: 'file',
    filePath: '.vel/discord-queue.json',
    maxSize: 10000,
    maxRetries: 5,
    flushIntervalMs: 5000,
  },
});
```

### How They Work Together

```
Normal Operation (CLOSED):
1. Log arrives → send to Discord
2. Success → ✅ done
3. Failure → record failure, retry up to 3 times
4. Still failing → queue for later

Circuit Opens (OPEN):
1. 5 consecutive failures → circuit opens
2. New logs → immediately queued (no API calls)
3. Circuit breaker prevents hammering Discord

Circuit Half-Open (HALF_OPEN):
1. After 30s → half-open state
2. Queue processor attempts to send queued messages
3. Success → circuit closes, normal operation resumes
4. Failure → circuit reopens, back to queueing

Queue Processing:
1. Periodic attempts every 100ms when circuit allows
2. Processes highest priority messages first
3. Retries up to maxRetries, then drops
```

### Complete Example

```typescript
import { Logger } from '@feizk/logger';
import { DiscordTransport } from '@feizk/logger-discord';

const logger = new Logger();

const transport = new DiscordTransport({
  webhookURL: process.env.DISCORD_WEBHOOK_URL!,
  level: 'error', // Only errors and fatal

  // Circuit breaker
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
  },

  // Persistent queue
  persistentQueue: {
    storage: 'file',
    filePath: '.vel/discord-queue.json',
    maxSize: 1000,
    maxRetries: 10,
  },

  // Batching (still works with queue)
  batching: {
    enabled: true,
    debounceMs: 1000,
    maxBatchSize: 10,
    immediateFlushLevels: ['error', 'fatal'],
  },
});

logger.addTransport(transport);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down, flushing logs...');
  await transport.destroy();
  process.exit(0);
});

// Log errors
logger.error('Critical failure!', {
  error: err.message,
  stack: err.stack,
  timestamp: new Date().toISOString(),
});
```

---

## Performance Optimization

### Batching Strategy

Batching is the most important performance optimization:

```typescript
// Good: Batch non-critical logs
new DiscordTransport({
  webhookURL: '...',
  batching: {
    enabled: true,
    debounceMs: 1000,    // Accumulate for 1s
    maxBatchSize: 10,    // Discord's limit
    immediateFlushLevels: ['error', 'fatal'], // Critical logs immediate
  },
});

// Bad: No batching (API spam)
new DiscordTransport({
  webhookURL: '...',
  batching: { enabled: false },
});
```

**Impact:**
- 100 info logs → ~10 API calls (90% reduction)
- Error logs still immediate
- Respects Discord rate limits

### Compression Threshold

Adjust compression based on your context size:

```typescript
// If you rarely have large context
new DiscordTransport({
  webhookURL: '...',
  compression: {
    enabled: true,
    threshold: 2048, // Only compress > 2KB
  },
});

// If you often have large context
new DiscordTransport({
  webhookURL: '...',
  compression: {
    enabled: true,
    threshold: 512, // Compress more aggressively
  },
});
```

### Log Level Filtering

Only send necessary logs:

```typescript
// Production: Only errors
new DiscordTransport({
  webhookURL: '...',
  level: 'error',
});

// Development: Everything
new DiscordTransport({
  webhookURL: '...',
  level: 'debug',
});
```

---

## Error Handling

### Automatic Retries

The transport automatically retries failed requests:

1. **Rate limits (429)** → Respect `retry_after` and retry up to 3 times
2. **Network errors** → Retry up to 3 times with exponential backoff
3. **HTTP errors (5xx)** → Queue for later if persistent queue enabled
4. **HTTP errors (4xx)** → Log error, drop message (client error)

### Manual Monitoring

```typescript
// Access internal components for monitoring
const transport = new DiscordTransport({ webhookURL: '...' });

// Check circuit breaker state
const breaker = (transport as any).circuitBreaker;
if (breaker) {
  console.log('Circuit:', breaker.getState());
  console.log('Failures:', breaker.getFailureCount());
}

// Check queue size
const queue = (transport as any).persistentQueue;
if (queue) {
  console.log('Queue size:', queue.size);
}
```

### Logging Transport Errors

Transport errors are logged to `console.error`. You can monitor them:

```typescript
// In development, you'll see:
// [DiscordTransport] Failed to send log: 429 Too Many Requests
// [DiscordTransport] Error sending log: Network error
```

For production, consider:

```typescript
// Also log to a file or monitoring system
const originalError = console.error;
console.error = (...args) => {
  // Send to your monitoring system
  monitoring.captureMessage(args.join(' '));
  originalError.apply(console, args);
};
```

---

## Best Practices

### 1. Environment-Based Configuration

```typescript
const isProd = process.env.NODE_ENV === 'production';

const transport = new DiscordTransport({
  webhookURL: isProd ? PROD_WEBHOOK : DEV_WEBHOOK,
  level: isProd ? 'error' : 'debug',
  batching: { enabled: !isProd ? false : true },
  persistentQueue: {
    storage: isProd ? 'file' : 'memory',
    filePath: '.vel/discord-queue.json',
  },
});
```

### 2. Separate Channels by Level

```typescript
// Create multiple transports for different channels
logger.addTransport(
  new DiscordTransport({
    webhookURL: ERROR_WEBHOOK,
    level: 'error', // Only errors
  }),
  new DiscordTransport({
    webhookURL: INFO_WEBHOOK,
    level: 'info',
    batching: { debounceMs: 5000 }, // Batch info logs longer
  }),
);
```

### 3. Graceful Shutdown

```typescript
import { Logger } from '@feizk/logger';
import { DiscordTransport } from '@feizk/logger-discord';

const logger = new Logger();
const transport = new DiscordTransport({ webhookURL: '...' });
logger.addTransport(transport);

// Handle shutdown signals
const shutdown = async (signal) => {
  console.log(`Received ${signal}, flushing logs...`);
  await transport.destroy();
  console.log('Logs flushed, exiting');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

### 4. Monitor Queue Health

```typescript
setInterval(() => {
  const queue = (transport as any).persistentQueue;
  if (queue && queue.size > 1000) {
    console.warn('Discord queue size high:', queue.size);
    // Alert your team
  }
}, 60000); // Check every minute
```

### 5. Test Configuration

```typescript
// Test your configuration on startup
(async () => {
  const transport = new DiscordTransport({ webhookURL: '...' });

  try {
    await transport.log({
      level: 'info',
      timestamp: new Date().toISOString(),
      args: ['Test message'],
      context: {},
    });
    console.log('✅ Discord transport working');
  } catch (error) {
    console.error('❌ Discord transport failed:', error);
  }
})();
```

---

## Troubleshooting

### Issue: Logs not appearing

**Checklist:**
- ✅ Webhook URL is correct
- ✅ Bot has permission to post in channel
- ✅ Log level is appropriate (e.g., `debug` won't send if level is `info`)
- ✅ Circuit breaker isn't open (check state)
- ✅ Network connectivity

### Issue: Rate limits

**Solutions:**
- Enable batching (default: on)
- Increase `debounceMs` to batch more
- Reduce log volume or increase level threshold
- Check if multiple transports are sending duplicate logs

### Issue: Queue growing indefinitely

**Checklist:**
- ✅ Discord webhook is correct and accessible
- ✅ Circuit breaker state (if open, queue will grow)
- ✅ `maxRetries` is appropriate
- ✅ Monitor queue size regularly
- ✅ Consider increasing `maxSize` or implementing queue cleanup

### Issue: High memory usage

**Solutions:**
- Use file storage instead of memory for large queues
- Reduce `maxSize`
- Process queue faster (check network/Discord API health)
- Implement queue monitoring and alerts

---

## Next Steps

- Review [Configuration Options](./configuration.md) for all settings
- See [API Reference](./api-reference.md) for complete type definitions
- Check [Getting Started](./getting-started.md) if you haven't already
