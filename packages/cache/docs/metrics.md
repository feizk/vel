# Metrics

Metrics are optional and disabled by default.

Enable them with `enableMetrics: true`.

```ts
const cache = new Cache<string>({
  backend,
  enableMetrics: true,
});
```

---

## Returned structure

```ts
interface CacheMetrics {
  hits: number;
  misses: number;
  gets: number;
  sets: number;
  deletes: number;
  clears: number;
  avgGetDuration: number;
  avgSetDuration: number;
  totalGetDuration: number;
  totalSetDuration: number;
  backend: Record<string, unknown>;
}
```

---

## Field meanings

- `hits`: successful cache reads.
- `misses`: missing reads.
- `gets`: total read operations.
- `sets`: total write operations.
- `deletes`: delete operation count.
- `clears`: clear operation count.
- `avgGetDuration`: mean get duration in ms.
- `avgSetDuration`: mean set duration in ms.
- `totalGetDuration`: sum of get durations in ms.
- `totalSetDuration`: sum of set durations in ms.
- `backend`: backend-specific diagnostics (`MemoryBackend` or `RedisBackend` stats).

---

## Example

```ts
await cache.set('a', '1');
await cache.get('a'); // hit
await cache.get('missing'); // miss

const metrics = cache.getMetrics();
console.log(metrics);
```

---

## Resetting metrics

```ts
cache.resetMetrics();
```

Useful for interval-based monitoring snapshots.

---

## Operational guidance

- Compare `hits` vs `misses` over fixed windows.
- Track `avgGetDuration` to detect backend latency regressions.
- Correlate misses with TTL policy and key churn.
- Use backend stats for memory pressure and connection state indicators.
