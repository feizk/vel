# Frequently Asked Questions

## General

### ❓ What is `@feizk/cache`?

A type-safe, multi-backend caching library for TypeScript/Node.js. It provides a unified API over different storage backends (Memory, Redis) with full generic types, TTL, metrics, and bulk operations.

### ❓ When should I use MemoryBackend vs RedisBackend?

- **MemoryBackend**: Development, testing, single-process apps, or when you need ultra-fast access and don't need persistence or distribution.
- **RedisBackend**: Production, multi-process/cluster environments, when you need persistence, or want to share cache across services.

See [Backends](backends.md) for a detailed comparison.

### ❓ Is this library production-ready?

Yes. It has comprehensive tests (73 unit tests, 100% pass), TypeScript strict mode, and handles errors gracefully. The codebase follows best practices and is used in production environments.

### ❓ Does it support Node.js streams or binary data?

Yes, via `Buffer`. The default serializer preserves `Buffer` instances. You can store and retrieve binary data safely.

### ❓ Can I use this in a browser?

No. This library is designed for Node.js (server-side). It depends on Node-specific APIs (Buffer, fs, etc.) and backends like Redis that aren't available in browsers. For browser caching, consider `localStorage` or `IndexedDB` wrappers.

---

## Performance

### ❓ How fast is MemoryBackend?

Operations are synchronous and typically complete in nanoseconds (memory access). There's virtually no overhead beyond the JavaScript function call and Map operations.

### ❓ What about RedisBackend latency?

Expect network round-trip times. On localhost, operations are usually sub-millisecond. Over a network, latency depends on your Redis deployment (typically 1–5ms for cloud Redis). Use pipelining (`setMany`, `getMany`) to reduce round trips.

### ❓ How do I improve cache hit rate?

- Choose appropriate TTL (not too short, not too long)
- Set a sufficient `maxEntries` (Memory) or memory limit (Redis)
- Use consistent cache keys (same shape for similar requests)
- Consider `getOrFetch` for automatic cache population
- Monitor metrics to see hits vs misses

### ❓ Does the library support compression?

Not built-in. If you have large values, compress them before caching (e.g., with `pako` for gzip) in a custom serializer.

---

## Types & Serialization

### ❓ Why did my `Date` become a string?

If you stored a `Date` but retrieved a plain string, your serializer may not be preserving types. The default `JsonSerializer` handles `Date` automatically. If you provided a custom serializer, ensure it includes type markers.

### ❓ Can I cache functions or classes?

No. Functions, Symbols, and `undefined` cannot be serialized to JSON. Store only data.

### ❓ What about circular references?

Circular references are detected and will throw a `CacheError` with code `SERIALIZATION_ERROR`. Break cycles before caching (e.g., use DTOs).

### ❓ Does serialization handle nested Maps/Sets?

Currently, only **top-level** special types (Date, RegExp, Map, Set, Buffer) are automatically restored. Nested ones inside plain objects/arrays will be deserialized as plain objects. This is a known limitation. Workaround: store nested special types as top-level properties or implement a custom serializer that recursively walks the structure.

---

## Configuration

### ❓ What happens if I don't set a namespace?

Keys are stored as-is without prefix. This is fine if you only have one cache instance. Using a namespace prevents key collisions when multiple caches share the same Redis instance.

### ❓ Can I change the namespace after creation?

No. The namespace is fixed at Cache construction. Create a new Cache instance with a different namespace if needed.

### ❓ How do I clear only some keys?

Use `keys(pattern)` to list keys matching a pattern, then `deleteMany()` to remove them. Example:

```typescript
const keys = await cache.keys('session:*');
await cache.deleteMany(keys);
```

### ❓ What is the difference between `Cache.namespace` and `RedisBackend.keyPrefix`?

- `namespace` (Cache): Prepended to every key you operate on. Helps isolate your application's cache.
- `keyPrefix` (RedisBackend): Added by the backend before the namespace. Useful for multi-tenancy on a shared Redis server.

Final key format: `{keyPrefix}{namespace}{key}`

---

## Error Handling

### ❓ What happens if Redis is down?

RedisBackend will attempt to reconnect according to its retry strategy. Operations will fail with a `CacheError` (`REDIS_ERROR`) until connection is restored. Your code should handle these errors gracefully.

### ❓ How do I catch cache errors?

```typescript
import { CacheError } from '@feizk/cache';

try {
  await cache.get('key');
} catch (error) {
  if (error instanceof CacheError) {
    console.error('Cache error:', error.code);
  }
}
```

### ❓ Can I disable error logging?

RedisBackend logs connection errors to `console.error` by default. To suppress, provide a custom `retryStrategy` that doesn't log, or patch the `error` event listener:

```typescript
const backend = new RedisBackend({ url });
backend['client'].off('error'); // remove default listener
```

---

## Testing

### ❓ How do I test code that uses the cache?

Use the `MemoryBackend` for unit tests – it's fast and requires no external services. You can also mock the `CacheBackend` interface with a simple in-memory fake.

### ❓ Are there integration tests?

Yes. The package includes unit tests for both backends (using `fakeredis` for Redis). There's also an advanced integration test (`testing/redis-debug.js`) that runs against a real Redis instance.

---

## Troubleshooting

Still stuck? Check the [Troubleshooting](troubleshooting.md) guide for common issues and solutions.
