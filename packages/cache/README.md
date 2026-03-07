# @feizk/cache

[![npm version](https://img.shields.io/npm/v/@feizk/cache.svg)](https://www.npmjs.com/package/@feizk/cache)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

> **Type-safe, multi-backend caching library for Node.js**  
> Supports Memory (LRU) and Redis backends with full generic types, TTL, metrics, and more.

## ✨ Features

- 🔒 **Fully typed** – Generic `Cache<T>` with no `any`
- ⚡ **Multiple backends** – Memory (LRU) & Redis out of the box
- ⏱️ **TTL support** – Per-key or default expiration
- 📊 **Metrics** – Hit/miss rates, operation durations
- 🔄 **Bulk ops** – `getMany`, `setMany`, `deleteMany`
- 🎯 **Cache-aside** – `getOrFetch` for lazy loading
- 🏷️ **Namespaces** – Key prefixing for multi-tenant apps
- 🧠 **Smart serialization** – Handles Date, Map, Set, Buffer, RegExp automatically

## 📦 Installation

```bash
pnpm add @feizk/cache
# or
npm install @feizk/cache
```

## 🚀 Quick Start

### Memory Backend (LRU)

```typescript
import { Cache, MemoryBackend } from '@feizk/cache';

const cache = new Cache<string>({
  backend: new MemoryBackend({ maxEntries: 1000 }),
  defaultTtl: 5 * 60 * 1000 // 5 minutes
});

await cache.set('key', 'hello');
const value = await cache.get('key'); // 'hello' | null
```

### Redis Backend

```typescript
import { Cache, RedisBackend } from '@feizk/cache';

const cache = new Cache<{ id: number; name: string }>({
  backend: new RedisBackend({ url: 'redis://localhost:6379' }),
  namespace: 'myapp',
  defaultTtl: 10 * 60 * 1000 // 10 minutes
});

const user = await cache.getOrFetch(
  `user:${id}`,
  async () => await db.users.findById(id)
);
```

## 📚 Documentation

For detailed API reference, backend configuration, serialization, metrics, FAQ, and troubleshooting, check the **[docs/](docs/)** directory:

- **[Getting Started](docs/getting-started.md)** – Installation and basic usage
- **[API Reference](docs/api-reference.md)** – All classes, methods, and options
- **[Backends](docs/backends.md)** – Memory vs Redis, when to use which
- **[Serialization](docs/serialization.md)** – How types are preserved
- **[Metrics](docs/metrics.md)** – Monitoring cache performance
- **[FAQ](docs/faq.md)** – Frequently asked questions
- **[Troubleshooting](docs/troubleshooting.md)** – Common issues and solutions

## 🤝 Contributing

Found a bug or have a suggestion? Please open an issue on [GitHub](https://github.com/feizk/vel).

## 📄 License

MIT © [feizk](https://github.com/feizk)
