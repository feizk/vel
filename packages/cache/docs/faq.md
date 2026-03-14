# FAQ

## Is `memory` required?

No. `@feizk/cache` works fully without memory layer. Use `memory` only when you want local L1 acceleration.

---

## Does memory layer replace backend?

No. Backend remains source of truth. Memory layer is a synchronized fast-access tier.

---

## Can I use a custom logger?

Yes. Pass `logger` with a `debug(...args)` method. If omitted, an internal logger instance is created.

---

## What does `update()` do?

`update()` applies `set` semantics (write backend + sync memory when enabled). It is a convenience method.

---

## Is Redis mandatory for production?

Not always. For single-instance services, memory backend may be enough. For distributed services, Redis is strongly recommended.

---

## Can I combine `namespace` and Redis `keyPrefix`?

Yes, and this is common in multi-service deployments.

---

## How do I avoid stale memory entries?

Use standard cache API methods (`set`, `update`, `delete`, `deleteMany`, `setMany`, `extendTtl`) consistently. These methods maintain synchronization paths.

---

## Should I enable debug in production?

Only for targeted diagnostics, because debug logging can increase log volume. Prefer metrics for continuous monitoring.
