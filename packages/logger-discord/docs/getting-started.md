# Getting Started Guide 🚀

Learn how to integrate `@feizk/logger-discord` into your application.

---

## Prerequisites

- Node.js 18+
- `@feizk/logger` package (peer dependency)
- Discord webhook URL

---

## Step 1: Installation 📦

Install the package and its peer dependency:

```bash
npm install @feizk/logger @feizk/logger-discord
```

---

## Step 2: Get Discord Webhook URL 🔗

1. Go to your Discord server
2. Navigate to the channel where you want logs
3. Open **Channel Settings** ⚙️
4. Go to **Integrations** → **Webhooks**
5. Click **Create Webhook**
6. Copy the webhook URL

---

## Step 3: Basic Usage 🎯

### Minimal Setup

```typescript
import { Logger } from '@feizk/logger';
import { DiscordTransport } from '@feizk/logger-discord';

// Create logger instance
const logger = new Logger();

// Add Discord transport
logger.addTransport(
  new DiscordTransport({
    webhookURL: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_URL',
  }),
);

// Start logging!
logger.info('Application started');
logger.warn('Warning message');
logger.error('Error occurred');
```

### Complete Example with Options

```typescript
import { Logger } from '@feizk/logger';
import { DiscordTransport } from '@feizk/logger-discord';

const logger = new Logger();

const discordTransport = new DiscordTransport({
  // Required
  webhookURL: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_URL',

  // Optional: Customize appearance
  username: 'My App Logger',
  avatarURL: 'https://example.com/logo.png',

  // Optional: Set minimum log level
  level: 'info', // 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

  // Optional: Include context (default: true)
  includeContext: true,
});

logger.addTransport(discordTransport);

// Log with context
logger.info('User logged in', {
  userId: 12345,
  username: 'john_doe',
  ip: '192.168.1.1',
});

// Different log levels
logger.debug('Debug info'); // Won't send (below 'info' threshold)
logger.info('Info message'); // ✅ Sends
logger.warn('Warning!'); // ✅ Sends
logger.error('Error!'); // ✅ Sends
logger.fatal('Fatal error!'); // ✅ Sends
```

---

## Step 4: Understanding Log Levels 📊

The transport respects log level thresholds. Levels are ordered:

```
trace < debug < info < warn < error < fatal
```

Only logs at or above the configured `level` are sent.

### Examples

```typescript
// Send everything
new DiscordTransport({
  webhookURL: '...',
  level: 'trace',
});

// Only warnings and above
new DiscordTransport({
  webhookURL: '...',
  level: 'warn',
});

// Errors only
new DiscordTransport({
  webhookURL: '...',
  level: 'error',
});
```

---

## Step 5: Custom Formatting 🎨

### Custom Formatter

Control how messages appear in Discord:

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  formatter: ({ level, timestamp, args, prefix, context }) => {
    const time = new Date(timestamp).toLocaleTimeString();
    const prefixStr = prefix ? `[${prefix}]` : '';
    const levelEmoji =
      {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        fatal: '💀',
      }[level] || '📝';

    return `${time} ${levelEmoji} **${level.toUpperCase()}** ${prefixStr} ${args.join(' ')}`;
  },
});
```

**Output in Discord:**

```
14:30:25 ℹ️ **INFO** [Auth] User logged in successfully
```

### Custom Payload

Full control over Discord webhook payload:

```typescript
const transport = new DiscordTransport({
  webhookURL: '...',
  customPayload: ({ level, args, context }) => {
    // Return complete Discord webhook payload
    return {
      username: 'My App',
      avatar_url: 'https://example.com/icon.png',
      content: level === 'error' ? `@here ${args[0]}` : undefined,
      embeds: [
        {
          title: `Log: ${level.toUpperCase()}`,
          description: args.join(' '),
          color: level === 'error' ? 0xff0000 : 0x0099ff,
          timestamp: new Date().toISOString(),
          fields: [
            {
              name: 'Environment',
              value: process.env.NODE_ENV || 'development',
              inline: true,
            },
            ...(context.userId
              ? [
                  {
                    name: 'User ID',
                    value: String(context.userId),
                    inline: true,
                  },
                ]
              : []),
          ],
        },
      ],
    };
  },
});
```

---

## Step 6: TypeScript Support 💪

Full TypeScript support with exported types:

```typescript
import type { LogLevel } from '@feizk/logger';
import {
  DiscordTransport,
  DiscordTransportOptions,
} from '@feizk/logger-discord';

const options: DiscordTransportOptions = {
  webhookURL: 'https://discord.com/api/webhooks/...',
  level: 'warn' satisfies LogLevel,
  username: 'My App',
};

const transport = new DiscordTransport(options);
```

---

## Common Patterns 📋

### Multiple Transports

```typescript
const logger = new Logger();

logger.addTransport(
  new DiscordTransport({ webhookURL: '...' }),
  // Add other transports like console, file, etc.
);
```

### Environment-Based Configuration

```typescript
const isProduction = process.env.NODE_ENV === 'production';

const transport = new DiscordTransport({
  webhookURL: isProduction
    ? 'https://discord.com/api/webhooks/production'
    : 'https://discord.com/api/webhooks/development',
  level: isProduction ? 'warn' : 'debug',
  batching: isProduction ? { enabled: true } : { enabled: false },
});
```

### Graceful Shutdown

```typescript
import { Logger } from '@feizk/logger';
import { DiscordTransport } from '@feizk/logger-discord';

const logger = new Logger();
const transport = new DiscordTransport({ webhookURL: '...' });
logger.addTransport(transport);

// Handle shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await transport.destroy(); // Flush pending logs
  process.exit(0);
});
```

---

## Troubleshooting 🔧

### Logs not appearing in Discord

1. Verify webhook URL is correct
2. Check that the bot has permission to post in the channel
3. Ensure log level is appropriate (e.g., `debug` won't send if level is `info`)
4. Check console for error messages

### Rate limits

The transport automatically handles Discord rate limits with retry logic. If you hit limits frequently:

- Enable batching (default: enabled)
- Reduce log volume or increase log level threshold

### Large context objects

Context is automatically compressed if it exceeds 1024 characters. You can adjust the threshold:

```typescript
new DiscordTransport({
  webhookURL: '...',
  compression: {
    enabled: true,
    threshold: 2048, // Compress at 2KB instead of 1KB
  },
});
```

---

## Next Steps 🎓

- Read [Configuration Options](./configuration.md) for all available settings
- Learn about [Advanced Features](./advanced-features.md) like circuit breaker and persistent queue
- Explore the [API Reference](./api-reference.md) for complete type definitions

---

## Need Help? 💬

- Check the [main README](../README.md) for quick reference
- Open an issue on [GitHub](https://github.com/feizk/logger-discord/issues)
