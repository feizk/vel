# Documentation 📚

Welcome to the `@feizk/logger-discord` documentation!

---

## 🎯 Quick Links

- **[Getting Started](./getting-started.md)** - Install and basic usage
- **[Configuration Options](./configuration.md)** - All available settings
- **[Advanced Features](./advanced-features.md)** - Circuit breaker, queue, best practices
- **[API Reference](./api-reference.md)** - Complete type definitions and methods

---

## 📖 Overview

`@feizk/logger-discord` is a Discord transport plugin for [`@feizk/logger`](https://www.npmjs.com/package/@feizk/logger). Send your application logs to Discord with powerful features:

✨ **Features**
- 🚀 **Batching** - Reduce API calls by up to 90%
- 🛡️ **Circuit Breaker** - Prevent cascade failures
- 💾 **Persistent Queue** - Never lose logs with disk persistence
- 🎨 **Custom Formatting** - Full control over message appearance
- 📦 **TypeScript** - Fully typed with exported types
- ⚡ **Priority Queueing** - Critical logs processed first
- 📊 **Compression** - Handle large context objects

---

## 🚀 Installation

```bash
npm install @feizk/logger @feizk/logger-discord
```

---

## 💡 Quick Example

```typescript
import { Logger } from '@feizk/logger';
import { DiscordTransport } from '@feizk/logger-discord';

const logger = new Logger();

logger.addTransport(
  new DiscordTransport({
    webhookURL: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_URL',
    level: 'error', // Only send errors
  }),
);

logger.error('Something went wrong!', { errorCode: 500 });
```

---

## 📚 Documentation Structure

### Getting Started 🎓

Perfect for first-time users. Covers:

- ✅ Installation
- ✅ Getting Discord webhook URL
- ✅ Basic usage examples
- ✅ Understanding log levels
- ✅ Custom formatting
- ✅ TypeScript support
- ✅ Common patterns
- ✅ Troubleshooting

**[Read Getting Started →](./getting-started.md)**

---

### Configuration Options ⚙️

Complete reference for all configuration options:

- **Basic Options**: webhookURL, username, avatarURL, level, includeContext
- **Styling Options**: formatter, levelColors, customPayload
- **Batching Options**: enabled, debounceMs, maxBatchSize, immediateFlushLevels
- **Compression Options**: enabled, threshold
- **Circuit Breaker Options**: failureThreshold, resetTimeoutMs, successThreshold
- **Persistent Queue Options**: storage, filePath, maxSize, maxRetries, flushIntervalMs

**[Read Configuration →](./configuration.md)**

---

### Advanced Features 🛡️

In-depth guides for advanced reliability features:

- **Circuit Breaker** - Prevent cascade failures with state management
- **Persistent Queue** - Store and retry failed messages
- **Combining Both** - Maximum reliability setup
- **Performance Optimization** - Batching strategies, compression tuning
- **Error Handling** - Monitoring and debugging
- **Best Practices** - Production-ready patterns

**[Read Advanced Features →](./advanced-features.md)**

---

### API Reference 📖

Complete API documentation:

- `DiscordTransport` class reference
- All type definitions (`DiscordTransportOptions`, `DiscordEmbed`, etc.)
- Exported constants (`DEFAULT_LEVEL_COLORS`, etc.)
- `CircuitBreaker` class
- `PersistentQueue` class
- `CircuitState` enum

**[Read API Reference →](./api-reference.md)**

---

## 🎨 Default Level Colors

| Level | Emoji | Color | Hex |
|-------|-------|-------|-----|
| `trace` | ⚪ | Gray | `0x95a5a6` |
| `debug` | 🔵 | Blue | `0x3498db` |
| `info` | 🟢 | Green | `0x2ecc71` |
| `warn` | 🟡 | Yellow | `0xf1c40f` |
| `error` | 🔴 | Red | `0xe74c3c` |
| `fatal` | 🟣 | Purple | `0x8e44ad` |

---

## 🔗 Related

- **[Main README](../README.md)** - Quick reference and feature overview
- **[GitHub Repository](https://github.com/feizk/logger-discord)** - Source code and issues
- **[@feizk/logger](https://www.npmjs.com/package/@feizk/logger)** - Core logger package

---

## 📝 License

MIT © [feizk](https://github.com/feizk)
