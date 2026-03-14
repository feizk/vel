# Design Notes

`Kit<K, V>` is intentionally minimal and optimized for cache-facing usage.

## Principles

1. **Small surface area**
   - only operations commonly needed in cache hot paths.
2. **Explicit value + expiry model**
   - record shape aligns with cache-layer metadata needs.
3. **Lazy expiration**
   - expired entries are removed when accessed, avoiding timer overhead per key.
4. **Low allocation pressure**
   - direct Map-backed storage and straightforward control flow.

## Intended integration pattern

`@feizk/cache` uses `Kit` as optional L1 memory storage while backend acts as L2 source of truth.

## Future extension directions

Potential additions (if needed by workload patterns):

- capacity-aware eviction hooks,
- segmented structures for high-cardinality keyspaces,
- sampling-based cleanup helpers,
- optional metrics counters directly in `Kit`.
