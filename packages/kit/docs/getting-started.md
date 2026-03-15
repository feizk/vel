# Getting Started

## Installation

Inside this monorepo, `@feizk/kit` is available as a workspace package.

For external usage:

```bash
pnpm add @feizk/kit
```

---

## Basic usage

```ts
import { Kit } from '@feizk/kit';

const users = new Kit<string, { name: string }>();

users.set('u:1', { name: 'Ada' });
console.log(users.get('u:1')); // { name: 'Ada' }
console.log(users.has('u:1')); // true

users.delete('u:1');
console.log(users.get('u:1')); // undefined
```

---

## TTL usage

```ts
const kit = new Kit<string, string>();

kit.setWithTtl('token:1', 'abc', 1_000);

// before expiry => value
console.log(kit.get('token:1'));

// after expiry => undefined (and entry is removed lazily)
setTimeout(() => {
  console.log(kit.get('token:1'));
}, 1_200);
```

---

## Record access

Use `getRecord` when you need both `value` and `expiresAt`.

```ts
const rec = kit.getRecord('token:1');
if (rec) {
  console.log(rec.value, rec.expiresAt);
}
```
