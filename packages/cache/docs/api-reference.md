# API Reference

This page documents the public API of `@feizk/cache`.

---

## `Cache<T>`

### Constructor

```ts
new Cache<T>(options: CacheOptions<T>)
```

### `CacheOptions<T>`

```ts
interface CacheOptions<T> {
  backend: CacheBackend<T>;
  namespace?: string;
  defaultTtl?: number;
  serialize?: (value: T) => Buffer | string;
  deserialize?: (data: Buffer | string) => T;
  enableMetrics?: boolean;
  debug?: boolean;
  logger?: { debug: (...args: unknown[]) => void };
  memory?: boolean | { enabled?: boolean; maxEntries?: number };
}
```

#### Option semantics

- `backend` (required): storage implementation.
- `namespace`: prefix applied by cache before backend operations.
- `defaultTtl`: used when operation-specific TTL is omitted.
- `serialize` / `deserialize`: custom conversion logic.
- `enableMetrics`: turns on operation counters and duration tracking.
- `debug`: enables debug logging.
- `logger`: optional custom logger; if omitted, internal logger is created.
- `memory`: enables optional L1 memory layer.

---

## Methods

### `get(key: string): Promise<T | null>`

Returns value or `null` if missing.

When memory is enabled:
- checks memory first,
- on miss reads backend,
- on backend hit repopulates memory.

### `set(key: string, value: T, ttl?: number | null): Promise<void>`

Stores value. TTL behavior:
- `undefined` → uses `defaultTtl`
- `null` → persistent
- positive number → expires in that many ms

Writes backend first, then updates memory when enabled.

### `update(key: string, value: T, ttl?: number | null): Promise<void>`

Alias-style update helper that uses `set` semantics.

### `delete(key: string): Promise<boolean>`

Removes key from backend and memory (if enabled).

Returns `true` if backend deleted an existing key.

### `clear(): Promise<void>`

Clears backend and memory layer.

### `getMany(keys: string[]): Promise<(T | null)[]>`

Resolves values in input order.

Current implementation resolves each key through `get`, meaning memory and debug behavior are consistently applied per key.

### `setMany(entries: [string, T][], ttl?: number | null): Promise<void>`

Batch write to backend, then synchronize memory for each key.

### `deleteMany(keys: string[]): Promise<number>`

Batch delete in backend, then remove same keys from memory.

### `has(key: string): Promise<boolean>`

Checks memory first (when enabled), otherwise backend existence.

### `keys(pattern?: string): Promise<string[]>`

Returns keys visible to this cache namespace.

### `getTtl(key: string): Promise<number>`

Returns:
- `-2` missing key,
- `-1` no expiration,
- positive number for remaining TTL ms.

### `extendTtl(key: string, ttl: number): Promise<boolean>`

Extends backend TTL and updates memory TTL for resident key.

### `getOrFetch(key, fetcher, options?): Promise<T>`

Cache-aside helper:
1. `get`
2. if hit, return
3. if miss, run fetcher
4. store fetched value
5. return fetched value

`options.ttl` controls write TTL.

### `getMetrics(): CacheMetrics`

Returns collected metrics.

### `resetMetrics(): void`

Resets all counters/durations to zero.

### `getBackend(): CacheBackend<T>`

Returns underlying backend instance.

### `getNamespace(): string`

Returns configured namespace.

### `isMetricsEnabled(): boolean`

Returns whether metrics are enabled.

---

## `CacheBackend<T>` contract

Custom backends must implement:

```ts
interface CacheBackend<T> {
  get(key: string): Promise<T | null>;
  getMany(keys: string[]): Promise<Map<string, T>>;
  set(key: string, value: T, options?: { ttl?: number | null }): Promise<void>;
  setMany(entries: [string, T][], options?: { ttl?: number | null }): Promise<void>;
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

## Logging events (debug mode)

When `debug: true`, cache emits detailed debug events for operations such as:

- `memory:get <key> (hit|miss)`
- `memory:set <key>`
- `memory:delete <key>`
- `redis:get <key> (hit|miss)`
- `redis:set <key>`
- `redis:delete <key>`
- `redis:setMany`
- `redis:deleteMany`
- `redis:clear *`

The logger receives details payloads (key, ttl, sizes, outcomes) where applicable.
