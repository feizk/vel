# Metrics

`@feizk/cache` can collect detailed performance metrics when `enableMetrics: true` is set in the Cache options. This data helps you understand cache effectiveness, spot bottlenecks, and tune configuration.

## 📊 Enabling Metrics

```typescript
const cache = new Cache({
  backend: new RedisBackend({ url: 'redis://localhost:6379' }),
  enableMetrics: true // <-- Turn on metrics
});
```

## 📈 Metrics Object

`cache.getMetrics()` returns a `CacheMetrics` object:

```typescript
interface CacheMetrics {
  hits: number;           // Number of cache hits
  misses: number;         // Number of cache misses
  gets: number;           // Total get operations
  sets: number;           // Total set operations
  deletes: number;        // Total delete operations
  clears: number;         // Total clear operations
  hitRate: number;        // Ratio of hits to gets (0–1)
  avgGetDuration: number; // Average get time in milliseconds
  avgSetDuration: number; // Average set time in milliseconds
  totalGetDuration: number; // Cumulative get time (ms)
  totalSetDuration: number; // Cumulative set time (ms)
  backend: Record<string, unknown>; // Backend-specific stats
}
```

## 🧮 Understanding the Numbers

### Hit Rate

```
hitRate = hits / gets
```

A high hit rate (e.g., 0.9 or 90%) means the cache is effectively serving requests. A low hit rate may indicate:

- TTL too short (entries expire before reuse)
- Cache size too small (entries evicted too quickly)
- Poor cache key selection (keys not reused)
- Workload not cacheable (unique requests every time)

### Durations

- `avgGetDuration`: Average time spent retrieving values (including backend latency).
- `avgSetDuration`: Average time spent storing values.

These help you compare backend performance (e.g., Memory vs Redis) and spot network issues.

### Backend Stats

The `backend` field contains backend-specific metrics:

- **MemoryBackend**: `{ size, totalMemoryBytes, maxEntries, maxMemoryBytes }`
- **RedisBackend**: `{ connected, keyPrefix }`

You can also call `backend.getStats()` directly for more detailed info.

## 🔄 Resetting Metrics

Call `cache.resetMetrics()` to zero all counters and durations. Useful for taking measurements over a specific interval.

```typescript
// Start measuring
cache.resetMetrics();

// ... run workload ...

const metrics = cache.getMetrics();
console.log(`Hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
```

## 📊 Example: Monitoring

```typescript
setInterval(() => {
  const m = cache.getMetrics();
  console.log({
    hitRate: `${(m.hitRate * 100).toFixed(1)}%`,
    gets: m.gets,
    hits: m.hits,
    misses: m.misses,
    avgGetMs: m.avgGetDuration.toFixed(2)
  });
}, 60_000);
```

## ⚠️ Performance Overhead

Metrics collection adds a small amount of overhead (a few nanoseconds per operation). It is safe to enable in production, but you can disable it (`enableMetrics: false`) if you need maximum performance.

---

*Also see: [API Reference](api-reference.md), [Troubleshooting](troubleshooting.md)*
