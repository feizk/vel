# API Reference

## Types

### `KitRecord<V>`

```ts
interface KitRecord<V> {
  value: V;
  expiresAt?: number;
}
```

---

## Class: `Kit<K, V>`

### `set(key: K, value: V, expiresAt?: number): this`

Stores a record directly. If `expiresAt` is provided and is in the past, subsequent reads remove it lazily.

### `setWithTtl(key: K, value: V, ttlMs: number): this`

Stores with expiration timestamp computed as `Date.now() + ttlMs`.

### `get(key: K): V | undefined`

Returns value if present and not expired. Removes and returns `undefined` for expired entries.

### `getRecord(key: K): KitRecord<V> | undefined`

Returns record object if present and valid; removes expired entries.

### `has(key: K): boolean`

Boolean presence check with expiration enforcement.

### `delete(key: K): boolean`

Deletes a key.

### `clear(): void`

Removes all entries.

### `size: number`

Current number of stored entries.

---

## Complexity notes

- `set`, `get`, `has`, `delete`: expected O(1)
- `clear`: O(n)
- `size`: O(1)

(Backed by native `Map`.)
