# @feizk/cache Documentation

Welcome to the official documentation for **@feizk/cache**, a type-safe, multi-backend caching library for TypeScript/Node.js.

## 🚀 Quick Links

- **[Getting Started](getting-started.md)** – Install and basic usage
- **[API Reference](api-reference.md)** – Full method signatures and types
- **[Backends](backends.md)** – Memory vs Redis, configuration
- **[Serialization](serialization.md)** – How data is stored and restored
- **[Metrics](metrics.md)** – Monitoring cache performance
- **[FAQ](faq.md)** – Frequently asked questions
- **[Troubleshooting](troubleshooting.md)** – Solve common problems

## ✨ Features at a Glance

- 🔒 **Fully typed** – Generic `Cache<T>` with strict TypeScript
- ⚡ **Multiple backends** – Memory (LRU) & Redis out of the box
- ⏱️ **TTL support** – Per-key or default expiration
- 📊 **Metrics** – Hit/miss rates, operation durations
- 🔄 **Bulk ops** – `getMany`, `setMany`, `deleteMany`
- 🎯 **Cache-aside** – `getOrFetch` for lazy loading
- 🏷️ **Namespaces** – Key prefixing for isolation
- 🧠 **Smart serialization** – Preserves Date, Map, Set, Buffer, RegExp

## 📦 Installation

```bash
pnpm add @feizk/cache
# or
npm install @feizk/cache
```

## 💡 Simple Example

```typescript
import { Cache, MemoryBackend } from '@feizk/cache';

const cache = new Cache<string>({
  backend: new MemoryBackend({ maxEntries: 1000 }),
  defaultTtl: 5 * 60 * 1000, // 5 minutes
});

await cache.set('greeting', 'Hello, world!');
const value = await cache.get('greeting'); // 'Hello, world!'
```

## 📖 Documentation Structure

1. **Getting Started** – Covers installation, core concepts, and basic operations.
2. **API Reference** – Detailed description of all public classes, methods, and options.
3. **Backends** – In-depth comparison and configuration for Memory and Redis.
4. **Serialization** – How the library handles special JavaScript types.
5. **Metrics** – Using performance metrics to monitor your cache.
6. **FAQ** – Answers to common questions.
7. **Troubleshooting** – Solutions for typical errors and issues.

## 🎯 Next Steps

- Read the [Getting Started](getting-started.md) guide.
- Explore the [API Reference](api-reference.md) to learn all available methods.
- Choose your backend and configure it using the [Backends](backends.md) guide.
- Understand how [Serialization](serialization.md) works to avoid pitfalls.
- Enable [Metrics](metrics.md) to keep an eye on cache health.

## 📄 License

MIT © [feizk](https://github.com/feizk)

---

_Need help? Check the [FAQ](faq.md) or [Troubleshooting](troubleshooting.md)._
