# @feizk/cache

**Type-safe, multi-backend caching library for TypeScript/Node.js**

A production-ready caching solution with full TypeScript support, multiple backend implementations (Memory, Redis), and a rich feature set including TTL, LRU eviction, metrics, and flexible serialization.

---

## 📦 Installation

```bash
pnpm add @feizk/cache
# or
npm install @feizk/cache
# or
yarn add @feizk/cache
```

### Peer Dependencies

This package requires **Node.js >= 18**.

For Redis backend:

```bash
pnpm add ioredis
# Already included as dependency
```

---

## 🚀 Quick Start

### Memory Backend (LRU)

```typescript
import { Cache } from '@feizk/cache';
import { MemoryBackend } from '@feizk/cache/backends/memory';

// Create a cache with LRU eviction (max 1000 entries)
const cache = new Cache<string>({
  backend: new MemoryBackend<string>({ maxEntries: 1000 }),
  namespace: 'myapp',
  defaultTtl: 5 * 60 * 1000, // 5 minutes
});

// Basic operations
await cache.set('key', 'value');
const value = await cache.get('key'); // 'value' | null
const exists = await cache.has('key'); // true
await cache.delete('key');
```

### Redis Backend

```typescript
import { Cache } from '@feizk/cache';
import { RedisBackend } from '@feizk/cache/backends/redis';

const cache = new Cache<{ id: number; name: string }>({
  backend: new RedisBackend({
    url: 'redis://localhost:6379',
    keyPrefix: 'myapp:',
  }),
  namespace: 'users',
  defaultTtl: 10 * 60 * 1000, // 10 minutes
  enableMetrics: true,
});

// Cache-aside pattern with getOrFetch
const user = await cache.getOrFetch(
  `user:${userId}`,
  async () => {
    // Fetch from database
    return await db.users.findById(userId);
  },
  { ttl: 10 * 60 * 1000 },
);
```

---

## ✨ Features

- **🔒 Fully Type-Safe**: Generic `Cache<T>` ensures type safety throughout
- **🔌 Multi-Backend**: Pluggable backend architecture (Memory, Redis)
- **⏱️ TTL Support**: Per-key TTL or global default TTL
- **📊 Metrics**: Built-in metrics collection (hits, misses, durations)
- **🔄 LRU Eviction**: Memory backend uses LRU policy with configurable limits
- **🏷️ Namespaces**: Key prefixing for multi-tenant isolation
- **🛠️ Custom Serialization**: Override serialization for complex types
- **⚡ Async-First**: All operations are async (Promise-based)
- **📦 Zero Dependencies** (except ioredis for Redis backend)

---

## 📚 API Reference

### `Cache<T>`

Main cache class that provides a unified API over any backend.

#### Constructor

```typescript
new Cache<T>(options: CacheOptions<T>)
```

**Options:**

| Property        | Type                             | Description                                |
| --------------- | -------------------------------- | ------------------------------------------ |
| `backend`       | `CacheBackend<T>`                | The storage backend (required)             |
| `namespace`     | `string?`                        | Prefix for all keys (optional)             |
| `defaultTtl`    | `number?`                        | Default TTL in milliseconds (optional)     |
| `serialize`     | `(value: T) => Buffer \| string` | Custom serializer (optional)               |
| `deserialize`   | `(data: Buffer \| string) => T`  | Custom deserializer (optional)             |
| `enableMetrics` | `boolean`                        | Enable metrics collection (default: false) |

#### Methods

##### Basic Operations

| Method   | Signature                                                         | Description                          |
| -------- | ----------------------------------------------------------------- | ------------------------------------ |
| `get`    | `get(key: string): Promise<T \| null>`                            | Retrieve a value by key              |
| `set`    | `set(key: string, value: T, ttl?: number \| null): Promise<void>` | Store a value (null = no expiration) |
| `delete` | `delete(key: string): Promise<boolean>`                           | Delete a key                         |
| `clear`  | `clear(): Promise<void>`                                          | Clear all keys in namespace          |
| `has`    | `has(key: string): Promise<boolean>`                              | Check if key exists                  |

##### Bulk Operations

| Method       | Signature                                                              | Description          |
| ------------ | ---------------------------------------------------------------------- | -------------------- |
| `getMany`    | `getMany(keys: string[]): Promise<(T \| null)[]>`                      | Get multiple values  |
| `setMany`    | `setMany(entries: [string, T][], ttl?: number \| null): Promise<void>` | Set multiple values  |
| `deleteMany` | `deleteMany(keys: string[]): Promise<number>`                          | Delete multiple keys |

##### Advanced

| Method       | Signature                                                                                | Description                                             |
| ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `getOrFetch` | `getOrFetch(key: string, fetcher: () => Promise<T>, options?: FetchOptions): Promise<T>` | Get or fetch on miss                                    |
| `keys`       | `keys(pattern?: string): Promise<string[]>`                                              | List keys (glob pattern supported)                      |
| `getTtl`     | `getTtl(key: string): Promise<number>`                                                   | Get remaining TTL in ms (-1 = persistent, -2 = missing) |
| `extendTtl`  | `extendTtl(key: string, ttl: number): Promise<boolean>`                                  | Extend TTL                                              |

##### Metrics

| Method         | Signature                    | Description               |
| -------------- | ---------------------------- | ------------------------- |
| `getMetrics`   | `getMetrics(): CacheMetrics` | Get current metrics       |
| `resetMetrics` | `resetMetrics(): void`       | Reset all metrics to zero |

##### Introspection

| Method             | Signature                       | Description                  |
| ------------------ | ------------------------------- | ---------------------------- |
| `getBackend`       | `getBackend(): CacheBackend<T>` | Get the underlying backend   |
| `getNamespace`     | `getNamespace(): string`        | Get the namespace prefix     |
| `isMetricsEnabled` | `isMetricsEnabled(): boolean`   | Check if metrics are enabled |

---

### `CacheBackend<T>`

Interface that all backends must implement.

```typescript
interface CacheBackend<T> {
  get(key: string): Promise<T | null>;
  getMany(keys: string[]): Promise<Map<string, T>>;
  set(key: string, value: T, options?: SetOptions): Promise<void>;
  setMany(entries: [string, T][], options?: SetOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  deleteMany(keys: string[]): Promise<number>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
  getTtl(key: string): Promise<number>;
  extendTtl?(key: string, ttl: number): Promise<boolean>;
  disconnect?(): Promise<void>;
}
```

---

### `SetOptions`

```typescript
interface SetOptions {
  ttl?: number | null; // milliseconds, null = no expiration
}
```

---

### `FetchOptions`

```typescript
interface FetchOptions extends SetOptions {
  staleWhileRevalidate?: boolean; // Update cache in background
}
```

---

### `CacheMetrics`

```typescript
interface CacheMetrics {
  hits: number;
  misses: number;
  gets: number;
  sets: number;
  deletes: number;
  clears: number;
  avgGetDuration: number; // milliseconds
  avgSetDuration: number; // milliseconds
  totalGetDuration: number;
  totalSetDuration: number;
  backend: Record<string, unknown>; // backend-specific stats
}
```

---

## 🔧 Backends

### MemoryBackend

In-memory LRU cache with optional TTL support.

```typescript
import { MemoryBackend } from '@feizk/cache/backends/memory';

const backend = new MemoryBackend<T>({
  maxEntries: 1000,          // Maximum number of entries
  maxMemoryBytes?: 1024 * 1024, // Optional memory limit (1MB)
  ttlCheckInterval: 60_000,  // TTL cleanup interval (1 min)
  onEvict?: (key, value, reason) => {
    console.log(`Evicted ${key} due to ${reason}`);
  },
});
```

**Features:**

- LRU (Least Recently Used) eviction
- Configurable max entries and/or memory size
- Background TTL cleanup
- Eviction callback

---

### RedisBackend

Redis-backed cache using ioredis.

```typescript
import { RedisBackend } from '@feizk/cache/backends/redis';

const backend = new RedisBackend<T>({
  url: 'redis://localhost:6379', // or use existing client
  keyPrefix: 'myapp:', // Prefix for all keys
  retryStrategy: (times) => Math.min(times * 100, 1000), // Retry backoff
});
```

**Features:**

- Native Redis TTL (PX flag for milliseconds)
- Connection pooling via ioredis
- Cluster-ready
- Automatic reconnection
- Pipeline for bulk operations

---

## 🎯 Advanced Usage

### Custom Serialization

By default, the cache uses JSON serialization with support for Date, RegExp, Map, Set, and Buffer. You can override this:

```typescript
import { Cache } from '@feizk/cache';
import { MemoryBackend } from '@feizk/cache/backends/memory';

// Custom serializer (e.g., for MessagePack, protobuf, etc.)
const cache = new Cache<MyType>({
  backend: new MemoryBackend(),
  serialize: (value) => msgpack.encode(value),
  deserialize: (data) => msgpack.decode(data),
});
```

### Stale-While-Revalidate

```typescript
const data = await cache.getOrFetch('key', async () => fetchFromAPI(), {
  staleWhileRevalidate: true, // Return stale data while updating in background
  ttl: 5 * 60 * 1000,
});
```

### Metrics Monitoring

```typescript
const cache = new Cache<string>({
  backend: new MemoryBackend(),
  enableMetrics: true,
});

// After some operations...
const metrics = cache.getMetrics();
console.log(`Hit rate: ${((metrics.hits / metrics.gets) * 100).toFixed(2)}%`);
console.log(`Avg get: ${metrics.avgGetDuration.toFixed(2)}ms`);
console.log(`Avg set: ${metrics.avgSetDuration.toFixed(2)}ms`);

// Reset metrics
cache.resetMetrics();
```

### Error Handling

All cache errors are wrapped in `CacheError`:

```typescript
import { CacheError } from '@feizk/cache';

try {
  await cache.get('key');
} catch (error) {
  if (error instanceof CacheError) {
    console.error('Cache error:', error.message);
    console.error('Code:', error.code);
    console.error('Cause:', error.cause);
  }
}
```

---

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:run -- --coverage
```

---

## 🏗️ Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev

# Lint
pnpm lint
pnpm lint:fix

# Type check
pnpm tsc
```

---

## 📁 Project Structure

```
packages/cache/
├── src/
│   ├── index.ts          # Main exports
│   ├── cache.ts          # Cache class
│   ├── types.ts          # Type definitions
│   ├── backends/
│   │   ├── memory.ts     # MemoryBackend (LRU)
│   │   └── redis.ts      # RedisBackend
│   ├── serializers/
│   │   ├── interface.ts  # Serializer interface
│   │   └── json.ts       # JSON serializer
│   └── utils/            # Utility functions (reserved)
├── tests/
│   ├── cache.test.ts
│   └── backends/
│       ├── memory.test.ts
│       └── redis.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

---

## 🎓 TypeScript Support

This library is written in TypeScript and provides full type definitions out of the box.

### Generic Type Inference

```typescript
// Type is inferred from the generic parameter
const cache = new Cache<string[]>(...);
const result = await cache.get('key'); // string[] | null

// Works with complex types too
interface User {
  id: number;
  name: string;
  email: string;
}

const userCache = new Cache<User>(...);
const user = await userCache.get('user:1'); // User | null
```

### No `any` Types

All public APIs are strictly typed with no `any` escapes.

---

## ⚡ Performance Tips

1. **Memory Backend**: Best for small datasets (<10k entries), single-process apps, or testing. Fastest access times (nanoseconds).

2. **Redis Backend**: Best for large datasets, multi-process/cluster deployments, or when persistence is needed. Network latency applies (~1ms local).

3. **TTL**: Set appropriate TTLs to prevent stale data. Use shorter TTLs for frequently changing data.

4. **Bulk Operations**: Use `getMany`/`setMany` for batch operations to reduce overhead.

5. **Metrics**: Enable metrics only in production if needed, as it adds some overhead.

6. **Serialization**: For primitive types, consider providing a no-op serializer to avoid JSON overhead.

---

## ❓ FAQ

### Q: Can I use both backends simultaneously?

A: Yes! Create separate Cache instances with different backends:

```typescript
const memoryCache = new Cache({ backend: new MemoryBackend() });
const redisCache = new Cache({ backend: new RedisBackend() });
```

### Q: How does LRU eviction work?

A: The MemoryBackend uses a Map which preserves insertion order. When an entry is accessed (get), it's moved to the end (most recently used). When eviction is needed, entries from the beginning (least recently used) are removed first.

### Q: Can I share the same Redis connection across multiple Cache instances?

A: Yes! Pass the same Redis client to multiple RedisBackend instances:

```typescript
const client = new Redis({ url: 'redis://localhost:6379' });
const cache1 = new Cache({ backend: new RedisBackend({ client }) });
const cache2 = new Cache({ backend: new RedisBackend({ client }) });
```

### Q: How do I handle connection errors with Redis?

A: The RedisBackend emits error events on the client. You can listen for them:

```typescript
backend.getBackend().client.on('error', (err) => {
  console.error('Redis connection error:', err);
});
```

### Q: Does the cache support clustering?

A: The RedisBackend uses ioredis which supports Redis Cluster. Just provide cluster nodes in the connection options:

```typescript
const backend = new RedisBackend({
  client: new Redis.Cluster([
    { host: '127.0.0.1', port: 6379 },
    { host: '127.0.0.1', port: 6379 },
  ]),
});
```

---

## 🐛 Troubleshooting

### Memory Backend growing too large

Check your `maxEntries` and `maxMemoryBytes` settings. The backend will evict entries when either limit is reached.

```typescript
const backend = new MemoryBackend({
  maxEntries: 1000,
  maxMemoryBytes: 1024 * 1024, // 1MB
});
```

### Redis connection issues

Ensure Redis is running and accessible. Check the connection URL and firewall settings. Enable debug logging:

```typescript
const client = new Redis({
  url: 'redis://localhost:6379',
  enableReadyCheck: true,
  retryStrategy: (times) => {
    console.log(`Retry attempt ${times}`);
    return Math.min(times * 100, 1000);
  },
});
```

### TTL not working

TTL is in **milliseconds**. Make sure you're not passing seconds:

```typescript
// Wrong (10 seconds instead of 10 minutes)
await cache.set('key', 'value', 10);

// Right (10 minutes)
await cache.set('key', 'value', 10 * 60 * 1000);
```

---

## 📄 License

MIT © feizk

---

## 🙏 Contributing

Contributions are welcome!

---

## 🔗 Related

- [ioredis](https://github.com/redis/ioredis) - Redis client used by RedisBackend
- [Vitest](https://vitest.dev/) - Test framework used for this package
