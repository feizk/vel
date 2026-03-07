# API Reference

## 📘 Table of Contents

- [Cache](#cache-class)
- [Backends](#backends)
- [Serializers](#serializers)
- [Types & Interfaces](#types--interfaces)

---

## Cache Class

The main entry point for caching operations.

### Constructor

```typescript
new Cache<T>(options: CacheOptions<T>)
```

#### CacheOptions<T>

| Property | Type | Description |
|----------|------|-------------|
| `backend` | `CacheBackend<T>` | **Required.** The storage backend (MemoryBackend, RedisBackend, or custom). |
| `namespace?` | `string` | Optional prefix for all keys (helps with isolation). |
| `defaultTtl?` | `number` | Default TTL in milliseconds. Omit for no expiration. |
| `serialize?` | `(value: T) => Buffer \| string` | Custom serializer function. |
| `deserialize?` | `(data: Buffer \| string) => T` | Custom deserializer function. |
| `enableMetrics?` | `boolean` | Enable metrics collection (default: `false`). |

### Methods

#### get

```typescript
get(key: string): Promise<T | null>
```

Retrieve a value by key. Returns `null` if the key does not exist.

#### set

```typescript
set(key: string, value: T, ttl?: number): Promise<void>
```

Store a value. Optionally provide a TTL in milliseconds (overrides `defaultTtl`).

#### delete

```typescript
delete(key: string): Promise<boolean>
```

Remove a key. Returns `true` if the key existed and was deleted.

#### clear

```typescript
clear(): Promise<void>
```

Delete all keys in the configured namespace (or all keys if no namespace).

#### has

```typescript
has(key: string): Promise<boolean>
```

Check if a key exists.

#### getMany

```typescript
getMany(keys: string[]): Promise<(T | null)[]>
```

Retrieve multiple values in one call. Returns an array with values in the same order as keys; missing keys yield `null`.

#### setMany

```typescript
setMany(entries: [string, T][], ttl?: number): Promise<void>
```

Store multiple key-value pairs. Optional TTL applies to all entries.

#### deleteMany

```typescript
deleteMany(keys: string[]): Promise<number>
```

Delete multiple keys. Returns the number of keys that were deleted.

#### getOrFetch

```typescript
getOrFetch(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number; staleWhileRevalidate?: boolean }
): Promise<T>
```

Cache-aside pattern: returns cached value if present; otherwise calls `fetcher`, caches the result, and returns it. The fetcher is only invoked on a cache miss.

#### keys

```typescript
keys(pattern?: string): Promise<string[]>
```

List keys matching a glob-style pattern (`*` and `?`). Without a pattern, returns all keys in the namespace. Keys are returned without the namespace prefix.

#### getTtl

```typescript
getTtl(key: string): Promise<number | null>
```

Get remaining TTL in milliseconds. Returns:
- Positive number: remaining TTL
- `-1`: key exists but has no expiration
- `-2`: key does not exist
- `null`: backend does not support TTL

#### extendTtl

```typescript
extendTtl(key: string, ttl: number): Promise<boolean>
```

Reset the TTL to `ttl` milliseconds from now. Returns `true` if the key existed and TTL was updated, `false` if the key does not exist.

#### getMetrics

```typescript
getMetrics(): CacheMetrics
```

Returns an object with cache statistics (hits, misses, rates, durations, backend stats). Only populated if `enableMetrics: true` was set in options.

#### resetMetrics

```typescript
resetMetrics(): void
```

Clear all accumulated metrics. Does not affect backend data.

---

## Backends

### MemoryBackend

In-memory LRU (Least Recently Used) cache.

#### Constructor

```typescript
new MemoryBackend(options?: MemoryBackendOptions)
```

#### MemoryBackendOptions

| Property | Type | Description |
|----------|------|-------------|
| `maxEntries?` | `number` | Maximum number of entries before eviction (default: `1000`). |
| `maxMemoryBytes?` | `number` | Optional approximate memory limit in bytes. |
| `onEvict?` | `(key: string, value: unknown) => void` | Callback when an entry is evicted. |

**Note:** `maxEntries` is the primary limiter. If `maxMemoryBytes` is also set, the backend will attempt to respect both, but eviction is based on entry count.

#### Methods

Implements `CacheBackend<T>` interface (see below). Additional method:

- `getStats(): { size: number; totalMemoryBytes: number; maxEntries: number; maxMemoryBytes: number | null }`

### RedisBackend

Redis-backed cache using ioredis.

#### Constructor

```typescript
new RedisBackend(options?: RedisBackendOptions)
```

#### RedisBackendOptions

| Property | Type | Description |
|----------|------|-------------|
| `url?` | `string` | Redis connection URL (default: `redis://localhost:6379`). |
| `client?` | `Redis` | Existing ioredis client (if provided, `url` is ignored). |
| `keyPrefix?` | `string` | Prefix for all Redis keys (different from Cache `namespace`). |
| `retryStrategy?` | `(times: number) => number` | Custom retry delay function. |
| `maxRetriesPerRequest?` | `number` | Max retries per command (default: `3`). |

#### Methods

Implements `CacheBackend<T>` interface. Additional methods:

- `getStats(): { connected: boolean; keyPrefix: string }`
- `disconnect(): Promise<void>` – Close the Redis connection.

---

## Serializers

### JsonSerializer (default)

Handles special types automatically:

- `Date` → `{ __type: 'Date', value: ISOString }`
- `RegExp` → `{ __type: 'RegExp', source, flags }`
- `Map` → `{ __type: 'Map', entries: [key, value][] }`
- `Set` → `{ __type: 'Set', values: any[] }`
- `Buffer` → `{ __type: 'Buffer', value: base64 }`

Plain objects and arrays are serialized normally. Nested special types are **not** recursively preserved (a known limitation; use top-level special types or implement a custom serializer for full nesting support).

### Custom Serializer

Implement the `Serializer<T>` interface:

```typescript
interface Serializer<T> {
  serialize(value: T): string;
  deserialize(data: Buffer | string): T;
  getSize?(value: T): number; // optional size estimator
}
```

Pass your serializer to the Cache constructor via `serialize`/`deserialize` options, or wrap it in a backend.

---

## Types & Interfaces

### CacheBackend<T>

The minimal interface a backend must implement:

```typescript
interface CacheBackend<T> {
  get(key: string): Promise<T | null>;
  getMany(keys: string[]): Promise<Map<string, T>>;
  set(key: string, value: T, options?: SetOptions): Promise<void>;
  setMany(entries: [string, T][], options?: SetOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  deleteMany(keys: string[]): Promise<number>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
  getTtl(key: string): Promise<number | null>;
  extendTtl?(key: string, ttl: number): Promise<boolean>; // optional
}
```

### SetOptions

```typescript
interface SetOptions {
  ttl?: number | null; // milliseconds; null = no expiration
}
```

### CacheMetrics

```typescript
interface CacheMetrics {
  hits: number;
  misses: number;
  gets: number;
  sets: number;
  deletes: number;
  clears: number;
  hitRate: number; // 0–1
  avgGetDuration: number; // ms
  avgSetDuration: number; // ms
  totalGetDuration: number; // ms
  totalSetDuration: number; // ms
  backend: Record<string, unknown>; // backend-specific stats
}
```

### CacheError

All cache-related errors are instances of `CacheError` with a `code` property:

```typescript
class CacheError extends Error {
  code: 'REDIS_ERROR' | 'DESERIALIZATION_ERROR' | 'SERIALIZATION_ERROR' | 'BACKEND_ERROR';
}
```

---

## 🎯 Quick Method Cheatsheet

| Method | Returns | Description |
|--------|---------|-------------|
| `get(key)` | `T \| null` | Retrieve value |
| `set(key, value, ttl?)` | `Promise<void>` | Store value |
| `delete(key)` | `boolean` | Remove key |
| `has(key)` | `boolean` | Existence check |
| `clear()` | `Promise<void>` | Remove all namespaced keys |
| `getMany(keys)` | `(T \| null)[]` | Batch retrieve |
| `setMany(entries, ttl?)` | `Promise<void>` | Batch store |
| `deleteMany(keys)` | `number` | Batch delete count |
| `getOrFetch(key, fetcher, opts?)` | `T` | Cache-aside |
| `keys(pattern?)` | `string[]` | List keys |
| `getTtl(key)` | `number \| null` | Remaining TTL |
| `extendTtl(key, ttl)` | `boolean` | Reset TTL |
| `getMetrics()` | `CacheMetrics` | Statistics |
| `resetMetrics()` | `void` | Clear stats |

---

*Need more help? Check the [FAQ](faq.md) or [Troubleshooting](troubleshooting.md).*
