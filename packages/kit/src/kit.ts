export interface KitRecord<V> {
  value: V;
  expiresAt?: number;
}

export class Kit<K, V> {
  private readonly store = new Map<K, KitRecord<V>>();

  set(key: K, value: V, expiresAt?: number): this {
    this.store.set(key, { value, expiresAt });
    return this;
  }

  setWithTtl(key: K, value: V, ttlMs: number): this {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { value, expiresAt });
    return this;
  }

  get(key: K): V | undefined {
    const record = this.store.get(key);
    if (!record) return undefined;

    if (record.expiresAt !== undefined && record.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return record.value;
  }

  getRecord(key: K): KitRecord<V> | undefined {
    const record = this.store.get(key);
    if (!record) return undefined;

    if (record.expiresAt !== undefined && record.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return record;
  }

  has(key: K): boolean {
    return this.getRecord(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
