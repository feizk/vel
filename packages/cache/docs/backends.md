# Backends

`@feizk/cache` supports pluggable backends. This guide explains the two built-in backends and helps you choose the right one for your use case.

## 🆚 Memory vs Redis

| Feature           | MemoryBackend                        | RedisBackend                                  |
| ----------------- | ------------------------------------ | --------------------------------------------- |
| **Persistence**   | ❌ In-memory only (lost on restart)  | ✅ Persistent (RDB/AOF)                       |
| **Distribution**  | Single process only                  | ✅ Multi-process / cluster                    |
| **Speed**         | ⚡ Ultra-fast (nanoseconds)          | ⚡ Fast (sub-millisecond)                     |
| **Capacity**      | Limited by RAM                       | Limited by Redis memory (can be larger)       |
| **TTL Precision** | Millisecond (via timer)              | Millisecond (native)                          |
| **Setup**         | Zero config                          | Requires Redis server                         |
| **Use Cases**     | Dev, testing, single-process caching | Production, distributed systems, shared cache |

---

## MemoryBackend

Ideal for:

- Development and testing
- Single-process applications
- Caching computed values within a single Node instance
- Scenarios where absolute speed is critical and data loss on restart is acceptable

### Configuration

```typescript
new MemoryBackend({
  maxEntries: 1000,          // Max number of entries (default: 1000)
  maxMemoryBytes?: number,   // Optional memory limit in bytes
  onEvict?: (key, value) => { /* callback when entry evicted */ }
});
```

### LRU Eviction

When `maxEntries` is reached, the **least recently used** entry is automatically evicted. Access order is updated on every `get` and `set`. The eviction is synchronous and efficient.

### TTL

TTL is managed via a background interval that checks for expired entries every second. Expired entries are removed lazily; they also return `null` on access.

### Stats

```typescript
const stats = backend.getStats();
// { size, totalMemoryBytes, maxEntries, maxMemoryBytes }
```

---

## RedisBackend

Ideal for:

- Production environments with multiple Node processes
- When you need cache persistence across restarts
- Large datasets that exceed a single process's memory
- Sharing cache between different services/languages
- High availability with Redis Sentinel/Cluster

### Configuration

```typescript
new RedisBackend({
  url: 'redis://localhost:6379', // or use `client` to provide existing Redis instance
  keyPrefix?: 'myapp:',          // Prefix for all keys (different from Cache namespace)
  retryStrategy?: (times) => Math.min(times * 100, 2000),
  maxRetriesPerRequest?: 3
});
```

### Connection Options

- **url**: Standard Redis URL. Supports `redis://`, `rediss://` (TLS), and `unix://`.
- **client**: Pass an existing ioredis `Redis` instance to share connections.
- **keyPrefix**: Added to every key before the Cache namespace. Useful for multi-tenant Redis.
- **retryStrategy**: Function that returns delay in ms between retries. Default: `times => Math.min(times * 100, 2000)`.
- **maxRetriesPerRequest**: How many times a command is retried on failure (default: 3).

### TTL

Redis handles TTL natively with millisecond precision using the `PX` flag. No background cleanup needed.

### Stats

```typescript
const stats = backend.getStats();
// { connected: boolean, keyPrefix: string }
```

### Cluster & Sentinel

RedisBackend works with Redis Cluster and Sentinel automatically when you provide a cluster-enabled URL or client. The underlying ioredis library handles routing and failover.

---

## 🛠️ Choosing a Backend

| Scenario                              | Recommendation                                       |
| ------------------------------------- | ---------------------------------------------------- |
| Local development, quick prototyping  | **MemoryBackend** (no external dependencies)         |
| Single server, moderate traffic       | **RedisBackend** (persistence, easy to scale later)  |
| Multiple servers/containers           | **RedisBackend** (shared cache)                      |
| Very large cache (> few GB)           | **RedisBackend** (leverages Redis memory management) |
| Need sub-millisecond latency          | **MemoryBackend** (but Redis is still very fast)     |
| Want cache to survive restarts        | **RedisBackend**                                     |
| Already have Redis for other purposes | **RedisBackend** (reuse existing infrastructure)     |

---

## 🔌 Custom Backends

You can implement your own backend by implementing the `CacheBackend<T>` interface. This allows integration with other stores like Memcached, DynamoDB, or even a file-based cache.

```typescript
class MyBackend<T> implements CacheBackend<T> {
  async get(key: string): Promise<T | null> {
    /* ... */
  }
  async getMany(keys: string[]): Promise<Map<string, T>> {
    /* ... */
  }
  async set(key: string, value: T, options?: SetOptions): Promise<void> {
    /* ... */
  }
  async setMany(entries: [string, T][], options?: SetOptions): Promise<void> {
    /* ... */
  }
  async delete(key: string): Promise<boolean> {
    /* ... */
  }
  async deleteMany(keys: string[]): Promise<number> {
    /* ... */
  }
  async exists(key: string): Promise<boolean> {
    /* ... */
  }
  async clear(): Promise<void> {
    /* ... */
  }
  async keys(pattern?: string): Promise<string[]> {
    /* ... */
  }
  async getTtl(key: string): Promise<number | null> {
    /* ... */
  }
  async extendTtl?(key: string, ttl: number): Promise<boolean> {
    /* ... */
  }
}
```

Then use it:

```typescript
const cache = new Cache({
  backend: new MyBackend(),
});
```

---

## ⚠️ Gotchas

- **MemoryBackend** is not suitable for production in multi-process environments (each process has its own isolated cache).
- **RedisBackend** requires a running Redis server. Ensure your Redis instance has enough memory and proper persistence settings if needed.
- TTL precision: MemoryBackend uses a cleanup interval (1s), so expiration may be up to 1 second late. Redis provides millisecond accuracy.
- Key length: Redis has a max key length of 512 MB (practically, keep keys < 1KB). MemoryBackend has no practical limit but large keys consume more RAM.

---

_Next: [Serialization](serialization.md) →_
