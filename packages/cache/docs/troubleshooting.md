# Troubleshooting

This guide lists practical issues and direct fixes.

---

## 1) I enabled `memory: true`, but still see backend reads

### Why this happens

- key was not yet present in memory,
- entry expired in memory due to TTL,
- key mismatch (namespace differences),
- data was deleted or updated by another process (Redis state changed).

### What to verify

1. Confirm your exact key string.
2. Confirm namespace value.
3. Check TTL via `getTtl`.
4. Enable `debug: true` and inspect `memory:get` and `redis:get` events.

---

## 2) Values disappear sooner than expected

### Likely causes

- TTL is shorter than assumed.
- Per-call TTL overrides default TTL.
- Expiration is intended and synchronized from backend TTL.

### Fix

- Audit writes (`set`, `setMany`, `getOrFetch` options).
- Log TTL value during writes.
- Compare backend TTL and memory state.

---

## 3) `keys()` results are surprising

`keys()` returns keys after cache namespace handling. If both Redis `keyPrefix` and cache `namespace` are configured, final backend key strings include both.

Use clear naming conventions and test patterns explicitly.

---

## 4) Redis errors

When Redis is unavailable, backend operations throw wrapped errors.

### Recommended approach

- Catch and classify cache failures.
- Fall back to source-of-truth read path.
- Emit telemetry (error code + operation).

---

## 5) Debug logs are not appearing

Check:

1. `debug: true` is set on `Cache`.
2. custom logger implements `debug(...)`.
3. your logger level allows debug output.

---

## 6) Memory and Redis seem inconsistent

Use this verification sequence:

1. write with `set`.
2. read with `get` twice (second should be memory hit).
3. delete with `delete`.
4. read again (should miss).

Enable debug and inspect event order (`redis:*` then `memory:*`).

---

## 7) High latency despite cache

Potential causes:

- low hit rate,
- expensive serialization,
- Redis network distance,
- oversized values,
- frequent key churn.

Actions:

- enable metrics,
- inspect hit/miss ratio,
- optimize TTL and key reuse,
- review payload size and serialization strategy.
