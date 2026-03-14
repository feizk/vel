# Serialization

Serialization determines how values are converted before backend storage and reconstructed on read.

---

## Default behavior

If you do not provide custom functions, cache uses JSON-based serialization.

```ts
const cache = new Cache<MyType>({ backend });
```

---

## Custom serializer/deserializer

Use custom logic when you need:

- compact binary encoding,
- compatibility with existing payload formats,
- strict schema evolution control.

```ts
const cache = new Cache<MyType>({
  backend,
  serialize: (value) => Buffer.from(JSON.stringify(value), 'utf8'),
  deserialize: (data) => JSON.parse(data.toString()),
});
```

---

## Design tips

1. Keep serializer deterministic.
2. Keep deserializer tolerant to older payloads when possible.
3. Prefer forward-compatible object shapes.
4. Validate critical fields if data may come from mixed versions.

---

## Error handling

Serialization/deserialization failures surface as cache operation errors (wrapped as `CacheError`).

Recommended pattern:

```ts
try {
  await cache.set('x', value);
} catch (error) {
  // fallback logic, telemetry, safe defaults
}
```

---

## Performance considerations

- For large objects, serialization cost may dominate latency.
- If payloads are already strings/buffers, avoid extra conversions.
- Benchmark representative payload sizes before finalizing serializer choice.
