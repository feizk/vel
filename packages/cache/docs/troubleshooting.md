# Troubleshooting

This guide helps you diagnose and resolve common issues with `@feizk/cache`.

## 🔍 Error Messages

### `CacheError: REDIS_ERROR - connect ECONNREFUSED`

**Cause:** Cannot connect to Redis server. The URL is wrong, Redis is not running, or a firewall blocks the connection.

**Solution:**
- Verify Redis is running: `redis-cli ping` should return `PONG`.
- Check the connection URL (host, port, password).
- If using a cloud Redis, ensure your IP is whitelisted.
- Test connectivity with `telnet <host> <port>`.

### `CacheError: DESERIALIZATION_ERROR - Unexpected token ...`

**Cause:** The stored data cannot be parsed as JSON. This may happen if you changed serializers or manually edited Redis data.

**Solution:**
- Ensure you're using the same serializer version as when the data was stored.
- Clear the affected keys (or the whole cache) if they're corrupted.
- If using a custom serializer, verify it produces valid JSON.

### `CacheError: SERIALIZATION_ERROR - Cannot serialize circular reference`

**Cause:** The value you're trying to cache contains a circular reference (object that references itself).

**Solution:**
- Remove circular references before caching (e.g., use `JSON.parse(JSON.stringify(obj))` to strip them, but beware of data loss).
- Redesign your data model to avoid cycles.
- Use DTOs (Data Transfer Objects) that are plain and acyclic.

### `TypeError: Cannot read property 'get' of undefined`

**Cause:** You called `cache.get()` before the backend was fully initialized, or the backend was not provided.

**Solution:**
- Ensure you passed a valid `backend` in Cache options.
- For Redis, wait for the connection to be ready (the library handles this automatically, but if you're using a custom client, ensure it's connected).

---

## 🐛 Common Issues

### TTL not expiring

**Symptom:** Keys remain in cache longer than expected.

**Check:**
- Are you using `null` or `undefined` for TTL? `null` means no expiration; `undefined` uses `defaultTtl` (if set).
- For MemoryBackend, the cleanup interval is 1 second. Expired keys may linger up to 1 second.
- For Redis, TTL is precise. Verify with `redis-cli ttl <key>`.

**Fix:** Set a proper TTL (in milliseconds). Use `cache.getTtl(key)` to inspect remaining time.

### Keys not found after set

**Symptom:** `set()` succeeds but `get()` returns `null`.

**Possible causes:**
- TTL is 0 or negative (immediate expiration). Ensure `ttl > 0`.
- Namespace mismatch: You're using different namespaces for set and get.
- Backend eviction: MemoryBackend evicted the key due to `maxEntries` limit.
- Serialization error: The value failed to serialize, but the error was swallowed. Check logs.

**Debug:**
- Use `cache.keys()` to list keys and verify the key exists (with namespace).
- Check backend directly (e.g., `redis-cli keys '*'` for Redis).
- Enable metrics to see eviction counts.

### High miss rate

**Symptom:** `hitRate` is low (e.g., < 0.2).

**Possible causes:**
- TTL too short: entries expire before they can be reused.
- Cache size too small: entries are evicted quickly (check `backend.getStats().size` vs `maxEntries`).
- Keys are too unique: each request uses a different key (e.g., includes timestamps or random values).
- Workload is not cacheable: every request is unique.

**Fix:**
- Increase `defaultTtl` or use per-key TTL.
- Increase `maxEntries` (Memory) or allocate more memory to Redis.
- Normalize cache keys (e.g., use stable identifiers).
- Consider caching at a higher level (e.g., database query results) rather than per-request data.

### MemoryBackend memory growth

**Symptom:** Process memory usage climbs indefinitely.

**Cause:** `maxEntries` is not set or is too high, and eviction isn't happening. The MemoryBackend only evicts when `maxEntries` is reached. If you never reach the limit, old entries are not removed even if expired (expired entries are removed lazily on access or during periodic cleanup, but if they're never accessed, they accumulate).

**Fix:**
- Set `maxEntries` to a reasonable limit.
- Periodically call `cache.clear()` if you need to flush.
- Use `backend.getStats().size` to monitor entry count.

### Redis connection drops

**Symptom:** Intermittent `REDIS_ERROR` after initial success.

**Cause:** Network issues, Redis server restart, or idle timeout.

**Solution:**
- The library includes automatic reconnection with exponential backoff. Errors during reconnection will still be thrown.
- Ensure your Redis server has appropriate `timeout` and `tcp-keepalive` settings.
- Consider using a managed Redis service with high availability.
- Implement retry logic in your code for transient failures:

```typescript
import { CacheError } from '@feizk/cache';

async function safeGet(key: string) {
  try {
    return await cache.get(key);
  } catch (error) {
    if (error instanceof CacheError && error.code === 'REDIS_ERROR') {
      // Optionally wait and retry once
      await new Promise(r => setTimeout(r, 1000));
      return await cache.get(key);
    }
    throw error;
  }
}
```

---

## 🛠️ Debugging Tips

### Enable Verbose Logging

The library uses minimal logging by default. For debugging, you can:

- Listen to Redis client events:

```typescript
const backend = new RedisBackend({ url });
backend['client'].on('error', (err) => console.error('Redis error:', err));
backend['client'].on('connect', () => console.log('Redis connected'));
backend['client'].on('close', () => console.log('Redis closed'));
```

- Use the `redis-debug.js` integration test as a template for thorough diagnostics.

### Inspect Raw Redis Data

Use `redis-cli` to see what's actually stored:

```bash
redis-cli keys 'namespace:*'   # list keys
redis-cli get 'key'           # get raw value (JSON)
redis-cli ttl 'key'           # check TTL
```

### Check Serialization

Log the serialized form:

```typescript
const backend = cache.backend as any;
const serializer = backend.serializer;
const serialized = serializer.serialize(value);
console.log('Serialized:', serialized);
```

### Metrics

Always enable metrics when investigating performance:

```typescript
const cache = new Cache({ backend, enableMetrics: true });
// ... run workload ...
console.log(cache.getMetrics());
```

---

## 📦 Still Stuck?

If you can't resolve an issue:

1. Check the [FAQ](faq.md) for common questions.
2. Search existing GitHub issues.
3. Open a new issue with:
   - Version of `@feizk/cache`
   - Node.js version
   - Backend used (Memory/Redis)
   - Minimal reproduction code
   - Error messages and stack traces
   - Metrics output if relevant

We'll be glad to help!
