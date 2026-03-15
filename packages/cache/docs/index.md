# @feizk/cache Documentation

`@feizk/cache` is a **typed, backend-agnostic cache facade** for Node.js applications.

It supports:

- a pluggable backend (`MemoryBackend`, `RedisBackend`, or custom `CacheBackend`),
- optional default TTL,
- key namespacing,
- optional metrics,
- optional debug logging,
- and an optional **L1 in-memory layer** (powered by `@feizk/kit`) that sits in front of your backend.

---

## What this package solves

Most applications need a common cache API across local and remote stores. `@feizk/cache` gives you one consistent `Cache<T>` interface so your application code does not care whether values come from in-process memory or Redis.

When enabled, the memory layer behaves like this:

1. Read from memory first.
2. On miss, read backend.
3. Backfill memory from backend value.
4. Keep memory synchronized on writes and deletes.

---

## Documentation map

- [Getting Started](./getting-started.md)
  - installation
  - first cache instance
  - memory + redis two-tier setup
- [API Reference](./api-reference.md)
  - complete `Cache<T>` options and methods
  - return values and semantics
- [Backends](./backends.md)
  - `MemoryBackend` and `RedisBackend`
  - when to use each
  - custom backend contract (`CacheBackend<T>`)
- [Serialization](./serialization.md)
  - default serializer behavior
  - custom serializer guidance
- [Metrics](./metrics.md)
  - enabling metrics
  - interpreting values
- [FAQ](./faq.md)
  - practical usage guidance
- [Troubleshooting](./troubleshooting.md)
  - common pitfalls and fixes

---

## Feature summary

### 1) Type-safe cache API

```ts
const cache = new Cache<User>({ backend });
```

All reads/writes are typed as `User`.

### 2) Backend abstraction

You can swap backend implementations with no call-site changes.

### 3) Optional TTL at two levels

- instance default (`defaultTtl`)
- per operation (`set`, `setMany`, `getOrFetch`)

### 4) Optional L1 memory cache

Enable with `memory: true` (or object form) to reduce backend round-trips.

### 5) Optional debug logging

Enable with `debug: true` and optionally pass `logger`.

### 6) Metrics

Enable with `enableMetrics: true` and call `getMetrics()`.

---

## Quick install

```bash
pnpm add @feizk/cache
```

For Redis usage:

```bash
pnpm add ioredis
```

---

## Version notes for this doc set

This documentation reflects the current implementation in this repository, including:

- `debug` and `logger` cache options,
- optional `memory` L1 support,
- `update()` method,
- synchronization behavior between memory and backend.
