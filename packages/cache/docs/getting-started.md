# Getting Started with @feizk/cache

## 📦 Installation

```bash
pnpm add @feizk/cache
# or
npm install @feizk/cache
```

## 🎯 Core Concepts

`@feizk/cache` provides a generic `Cache<T>` class that works with any data type. You plug in a backend (Memory or Redis) and enjoy type-safe caching with optional TTL, metrics, and more.

## 🔧 Basic Usage

### 1. Choose a Backend

#### Memory Backend (LRU)

Ideal for single-process applications, development, or caching within a single Node instance.

```typescript
import { Cache, MemoryBackend } from '@feizk/cache';

const cache = new Cache<string>({
  backend: new MemoryBackend({
    maxEntries: 1000, // Maximum number of entries (default: 1000)
    // maxMemoryBytes: 10 * 1024 * 1024 // Optional memory limit (bytes)
  }),
  defaultTtl: 5 * 60 * 1000, // 5 minutes (optional)
});
```

#### Redis Backend

Perfect for distributed systems, multi-process setups, or when you need persistence.

```typescript
import { Cache, RedisBackend } from '@feizk/cache';

const cache = new Cache<User>({
  backend: new RedisBackend({
    url: 'redis://localhost:6379',
    // password: 'yourpassword', // if needed
    // keyPrefix: 'myapp:' // optional prefix
  }),
  namespace: 'myapp', // All keys will be prefixed with "myapp:"
  defaultTtl: 10 * 60 * 1000, // 10 minutes
});
```

### 2. Perform Cache Operations

```typescript
// Set a value
await cache.set('user:123', { id: 123, name: 'Alice' });

// Get a value (returns null if missing)
const user = await cache.get('user:123');

// Check existence
const exists = await cache.has('user:123');

// Delete a key
await cache.delete('user:123');

// Clear all namespaced keys
await cache.clear();
```

### 3. Use Cache-Aside Pattern

```typescript
const user = await cache.getOrFetch(
  `user:${userId}`,
  async () => {
    // This fetcher runs only on cache miss
    const dbUser = await db.users.findById(userId);
    return dbUser;
  },
  { ttl: 5 * 60 * 1000 }, // Optional per-call TTL
);
```

### 4. Bulk Operations

```typescript
// Set multiple keys at once
await cache.setMany(
  [
    ['key1', 'value1'],
    ['key2', 'value2'],
    ['key3', 'value3'],
  ],
  60_000,
); // Optional TTL (1 minute)

// Get multiple keys
const values = await cache.getMany(['key1', 'key2', 'missing']);
// Returns [ 'value1', 'value2', null ]

// Delete multiple keys
const deletedCount = await cache.deleteMany(['key1', 'key2']);
```

### 5. TTL Management

```typescript
// Set with TTL (overrides default)
await cache.set('temp', 'data', 30_000); // 30 seconds

// Extend TTL of an existing key
await cache.extendTtl('temp', 60_000); // Add another 60 seconds

// Check remaining TTL (ms)
const ttl = await cache.getTtl('temp');
// Returns: number (ms), -1 (no expiration), -2 (missing)
```

### 6. Metrics

```typescript
const metrics = cache.getMetrics();
console.log(metrics);
// {
//   hits: 42,
//   misses: 8,
//   gets: 50,
//   sets: 30,
//   deletes: 5,
//   clears: 1,
//   hitRate: 0.84,
//   avgGetDuration: 0.5, // ms
//   avgSetDuration: 0.7, // ms
//   backend: { ... } // backend-specific stats
// }
```

## 🛠️ Advanced Configuration

### Custom Serialization

By default, the library uses a JSON serializer that preserves special types (Date, Map, Set, Buffer, RegExp). You can provide your own serializer:

```typescript
import { Serializer } from '@feizk/cache';

class CustomSerializer<T> implements Serializer<T> {
  serialize(value: T): string {
    // Your custom serialization logic
    return JSON.stringify(value);
  }

  deserialize(data: Buffer | string): T {
    // Your custom deserialization logic
    return JSON.parse(data.toString()) as T;
  }

  getSize(value: T): number {
    return Buffer.byteLength(this.serialize(value), 'utf8');
  }
}

const cache = new Cache<MyType>({
  backend: new MemoryBackend(),
  serialize: (value) => customSerializer.serialize(value),
  deserialize: (data) => customSerializer.deserialize(data),
});
```

### Namespaces

Namespaces prefix all keys automatically, helping you isolate caches in shared Redis instances:

```typescript
const cache = new Cache({
  backend: new RedisBackend({ url: 'redis://...' }),
  namespace: 'production:api', // Keys become "production:api:actual_key"
});
```

### Error Handling

All cache errors are thrown as `CacheError` with a `code` property:

```typescript
import { CacheError } from '@feizk/cache';

try {
  await cache.get('key');
} catch (error) {
  if (error instanceof CacheError) {
    console.error(error.code); // 'REDIS_ERROR', 'DESERIALIZATION_ERROR', etc.
  }
}
```

## 🔍 Next Steps

- Read the [API Reference](api-reference.md) for complete method signatures and options.
- Learn about [backends](backends.md) to choose the right one.
- Understand [serialization](serialization.md) for complex types.
- Check the [FAQ](faq.md) for common questions.
- Visit [Troubleshooting](troubleshooting.md) if you encounter issues.
