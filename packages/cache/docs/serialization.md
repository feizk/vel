# Serialization

`@feizk/cache` automatically serializes values before storing them in the backend and deserializes on retrieval. The default serializer handles many common JavaScript types with special markers to preserve type information.

## 🔧 Default JSON Serializer

The built-in `JsonSerializer` uses JSON with type markers for special objects. It supports:

| Type                                       | Serialized Form                                           | Notes                       |
| ------------------------------------------ | --------------------------------------------------------- | --------------------------- |
| `Date`                                     | `{ "__type": "Date", "value": "ISO-8601 string" }`        | Restored as `Date` instance |
| `RegExp`                                   | `{ "__type": "RegExp", "source": "...", "flags": "..." }` | Restored as `RegExp`        |
| `Map`                                      | `{ "__type": "Map", "entries": [ [k,v], ... ] }`          | Restored as `Map`           |
| `Set`                                      | `{ "__type": "Set", "values": [...] }`                    | Restored as `Set`           |
| `Buffer`                                   | `{ "__type": "Buffer", "value": "base64 string" }`        | Restored as `Buffer`        |
| Plain objects/arrays                       | Standard JSON                                             | No type markers             |
| Primitives (string, number, boolean, null) | Standard JSON                                             | No type markers             |

### Example

```typescript
import { Cache, MemoryBackend } from '@feizk/cache';

const cache = new Cache<{ date: Date; map: Map<string, number> }>({
  backend: new MemoryBackend(),
});

const data = {
  date: new Date('2023-01-01'),
  map: new Map([
    ['a', 1],
    ['b', 2],
  ]),
};

await cache.set('key', data);
const retrieved = await cache.get('key');

console.log(retrieved.date instanceof Date); // true
console.log(retrieved.map instanceof Map); // true
```

## ⚠️ Limitations

### Nested Special Types

The current serializer **does not recursively preserve** special types nested inside plain objects or arrays. Only top-level special types are automatically restored.

```typescript
const data = {
  meta: {
    created: new Date(), // ❌ This will be a plain object after deserialization
  },
};
```

**Workaround:** Store special types as top-level properties, or implement a custom serializer that recursively walks the structure.

### Circular References

Circular references are **not supported** and will throw a `CacheError` with code `SERIALIZATION_ERROR`. You must break cycles before caching.

### Functions, Symbols, Undefined

These cannot be serialized and will be lost or cause errors if present in cached values.

---

## 🔨 Custom Serializer

If you need full control, implement the `Serializer<T>` interface:

```typescript
import { Serializer } from '@feizk/cache';

class MySerializer<T> implements Serializer<T> {
  serialize(value: T): string {
    // Convert value to a string representation
    return JSON.stringify(value);
  }

  deserialize(data: Buffer | string): T {
    // Parse string back to T
    return JSON.parse(data.toString()) as T;
  }

  // Optional: estimate size in bytes
  getSize(value: T): number {
    return Buffer.byteLength(this.serialize(value), 'utf8');
  }
}
```

Then pass it to the Cache constructor:

```typescript
const cache = new Cache<T>({
  backend: new MemoryBackend(),
  serialize: (value) => mySerializer.serialize(value),
  deserialize: (data) => mySerializer.deserialize(data),
});
```

Or, if you're using a custom backend, you can pass the serializer directly to the backend's constructor (if it accepts one).

---

## 🎯 Best Practices

1. **Keep cached values simple** – Avoid deeply nested structures with mixed special types.
2. **Use top-level special types** – Store Dates, Maps, Sets, Buffers as direct values, not nested.
3. **Version your serialized data** – If you change your data shape, consider adding a `version` field to avoid deserialization surprises.
4. **Test round-trips** – Write unit tests that verify `serialize(deserialize(data)) === data` for your important types.
5. **Consider compression** – For large values, you might want to compress after serialization (e.g., with `pako` or `zlib`). Implement this in a custom serializer.

---

## 🔍 How It Works

1. **Set**: Value → `serialize()` → string/buffer → stored in backend.
2. **Get**: Backend returns string/buffer → `deserialize()` → original value (with types restored).
3. **Size estimation** (for memory backend): `getSize()` is used if provided; otherwise falls back to `Buffer.byteLength(serialized)`.

The serializer is **backend-agnostic**; the same serializer works with Memory and Redis backends.

---

_Need more? See [FAQ](faq.md) or [Troubleshooting](troubleshooting.md)._
