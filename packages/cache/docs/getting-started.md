# Getting Started

This guide walks you from zero setup to a production-style two-tier cache configuration.

---

## Installation

```bash
pnpm add @feizk/cache
```

If you use Redis backend:

```bash
pnpm add ioredis
```

---

## 1) Minimal cache (memory backend only)

```ts
import { Cache, MemoryBackend } from '@feizk/cache';

const cache = new Cache<string>({
  backend: new MemoryBackend({ maxEntries: 10_000 }),
  defaultTtl: 60_000,
});

await cache.set('greeting', 'hello');
const value = await cache.get('greeting');
```

This is a single-process, in-memory cache.

---

## 2) Redis-backed cache

```ts
import { Cache, RedisBackend } from '@feizk/cache';

const cache = new Cache<{ id: string; name: string }>({
  backend: new RedisBackend({
    url: 'redis://localhost:6379',
    keyPrefix: 'app:',
  }),
  namespace: 'users',
  defaultTtl: 5 * 60_000,
});

await cache.set('42', { id: '42', name: 'Ada' });
const user = await cache.get('42');
```

Effective key shape is backend-specific prefix + namespace + key.

---

## 3) Two-tier cache (L1 memory + L2 backend)

You can put a memory layer in front of your backend:

```ts
import { Cache, RedisBackend } from '@feizk/cache';

const cache = new Cache<string>({
  backend: new RedisBackend({ url: 'redis://localhost:6379' }),
  memory: true,
  defaultTtl: 30_000,
});
```

### Read flow when `memory` is enabled

1. Check memory.
2. If memory hit, return immediately.
3. If memory miss, read backend.
4. If backend hit, populate memory with backend TTL alignment.

### Write flow when `memory` is enabled

- `set` / `update`: write backend, then update memory.
- `delete` / `deleteMany`: remove from backend, then remove from memory.
- `setMany`: write backend batch, then update memory entries.
- `extendTtl`: extend backend TTL and mirror in memory if present.

---

## 4) Debug logging

Enable detailed cache logs:

```ts
import { Cache, RedisBackend } from '@feizk/cache';

const cache = new Cache<string>({
  backend: new RedisBackend({ url: 'redis://localhost:6379' }),
  memory: true,
  debug: true,
});
```

### Custom logger

```ts
import { Logger } from '@feizk/logger';
import { Cache, RedisBackend } from '@feizk/cache';

const logger = new Logger({ prefix: 'my-service-cache', level: 'debug' });

const cache = new Cache<string>({
  backend: new RedisBackend({ url: 'redis://localhost:6379' }),
  debug: true,
  logger,
});
```

When `debug` is `false`, debug log calls are not emitted.

---

## 5) Core operations

```ts
await cache.set('k', 'v');
await cache.update('k', 'v2');

const one = await cache.get('k');
const many = await cache.getMany(['k', 'missing']);

const has = await cache.has('k');

await cache.setMany([
  ['a', '1'],
  ['b', '2'],
]);

await cache.delete('k');
await cache.deleteMany(['a', 'b']);

const ttl = await cache.getTtl('k');
await cache.extendTtl('k', 10_000);

const keys = await cache.keys('user:*');
await cache.clear();
```

---

## 6) Cache-aside helper (`getOrFetch`)

```ts
const profile = await cache.getOrFetch(
  `profile:${id}`,
  async () => fetchProfileFromDatabase(id),
  { ttl: 120_000 },
);
```

If value is present, it returns cached data. If not, it fetches, stores, and returns.

---

## 7) Metrics

```ts
const cache = new Cache<string>({
  backend: new MemoryBackend(),
  enableMetrics: true,
});

await cache.get('x');
console.log(cache.getMetrics());
```

See [Metrics](./metrics.md) for complete interpretation details.
