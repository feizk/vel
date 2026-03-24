# Backends

`@feizk/cache` separates cache API from storage implementation through `CacheBackend<T>`.

---

## Built-in backends

## 1) `MemoryBackend<T>`

An in-process backend with LRU-style eviction metadata and optional TTL cleanup.

### Good for

- unit/integration testing,
- local development,
- single-process workloads,
- ultra-low latency in one Node process.

### Example

```ts
import { Cache, MemoryBackend } from '@feizk/cache';

const backend = new MemoryBackend<string>({
  maxEntries: 50_000,
  maxMemoryBytes: 128 * 1024 * 1024,
  ttlCheckInterval: 60_000,
});

const cache = new Cache<string>({ backend });
```

### Notes

- Data is process-local and non-persistent.
- Not shared between workers/instances.
- Eviction may happen when configured limits are reached.

---

## 2) `RedisBackend<T>`

A distributed backend powered by `ioredis`.

### Good for

- multi-instance APIs,
- distributed workers,
- shared cache across services,
- persistence across process restarts.

### Example

```ts
import { Cache, RedisBackend } from '@feizk/cache';

const backend = new RedisBackend<string>({
  url: 'redis://localhost:6379',
  keyPrefix: 'svc:',
});

const cache = new Cache<string>({
  backend,
  namespace: 'users',
});
```

---

## Choosing backend + optional L1 memory

Common production setup:

- L1: cache memory layer (`memory: true`) in `Cache<T>`
- L2: `RedisBackend`

```ts
const cache = new Cache<string>({
  backend: new RedisBackend({ url: 'redis://localhost:6379' }),
  memory: true,
});
```

This pattern can reduce Redis reads for hot keys while preserving shared distributed state.

---

## Custom backends

You can implement your own backend by fulfilling `CacheBackend<T>`.

Typical examples:

- DynamoDB-backed cache table,
- Mongo collection cache,
- in-house key-value service.

Start with the method contract in [API Reference](./api-reference.md).

---

## Key naming considerations

Two prefix systems can combine:

- `Cache` namespace (`namespace` option)
- backend-specific prefix (e.g., Redis `keyPrefix`)

Plan key strategy early to avoid collisions and simplify selective invalidation.
