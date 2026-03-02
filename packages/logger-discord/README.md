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
    webhookURL: 'https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz',
  })
);

logger.info('Hello Discord!');
logger.error('Something went wrong', { errorCode: 500 });
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `webhookURL` | `string` | (required) | Discord webhook URL |
| `username` | `string` | `'Logger'` | Username to display in Discord |
| `avatarURL` | `string` | `undefined` | Avatar URL for the webhook |
| `level` | `LogLevel` | `'info'` | Minimum log level to send to Discord |
| `formatter` | `function` | `undefined` | Custom formatter function |
| `levelColors` | `Record<LogLevel, number>` | see below | Custom colors for each log level |
| `includeContext` | `boolean` | `true` | Whether to include context in embeds |
| `customPayload` | `function` | `undefined` | Custom payload builder function |

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
