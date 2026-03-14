# @feizk/kit Documentation

`@feizk/kit` provides lightweight primitives for cache-heavy workloads.

Current primary export:

- `Kit<K, V>`: a specialized key-value collection with optional TTL-aware records and lazy expiration on access.

---

## Why this package exists

This package isolates in-memory collection mechanics from higher-level cache orchestration.

Use it when you need:

- predictable collection API,
- explicit record shape (`value`, optional `expiresAt`),
- low-overhead operations suitable for hot-path access.

---

## Documentation map

- [Getting Started](./getting-started.md)
- [API Reference](./api-reference.md)
- [Design Notes](./design-notes.md)
