# @feizk/logger-discord 🎯

> 🚀 Send logs to Discord with powerful features

Discord transport plugin for [@feizk/logger](https://www.npmjs.com/package/@feizk/logger).

---

## 📦 Installation

```bash
npm install @feizk/logger @feizk/logger-discord
```

---

## 🚀 Quick Start

```typescript
import { Logger } from '@feizk/logger';
import { DiscordTransport } from '@feizk/logger-discord';

const logger = new Logger();

logger.addTransport(
  new DiscordTransport({
    webhookURL: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN',
  }),
);

logger.info('Hello Discord! 🎉');
logger.error('Something went wrong!', { errorCode: 500 });
```

---

## 📚 Documentation

For comprehensive documentation, check out the **[docs/](./docs/)** folder:

- **[Getting Started Guide](./docs/getting-started.md)** - Detailed setup and basic usage
- **[Configuration Options](./docs/configuration.md)** - All available options explained
- **[Advanced Features](./docs/advanced-features.md)** - Circuit breaker, persistent queue, and more
- **[API Reference](./docs/api-reference.md)** - Complete API documentation

---

## ✨ Features

- ✅ **Batching** - Reduce API calls by up to 90%
- ✅ **Compression** - Handle large context objects
- ✅ **Circuit Breaker** - Prevent cascade failures
- ✅ **Persistent Queue** - Never lose logs with disk persistence
- ✅ **Custom Formatting** - Full control over message appearance
- ✅ **TypeScript** - Fully typed with exported types
- ✅ **Priority Queueing** - Critical logs processed first

---

## 🎨 Default Colors

| Level | Color | Hex |
|-------|-------|-----|
| `trace` | ⚪ Gray | `0x95a5a6` |
| `debug` | 🔵 Blue | `0x3498db` |
| `info` | 🟢 Green | `0x2ecc71` |
| `warn` | 🟡 Yellow | `0xf1c40f` |
| `error` | 🔴 Red | `0xe74c3c` |
| `fatal` | 🟣 Purple | `0x8e44ad` |

---

## 📝 License

MIT © [feizk](https://github.com/feizk)
