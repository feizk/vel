import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Cache } from '../src/cache';
import { MemoryBackend } from '../src/backends/memory';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    const backend = new MemoryBackend<string>({ maxEntries: 100 });
    cache = new Cache<string>({
      backend,
      namespace: 'test',
      defaultTtl: 60_000, // 1 minute
      enableMetrics: true,
    });
  });

  afterEach(async () => {
    const backend = cache.getBackend() as MemoryBackend<string>;
    await backend.disconnect();
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      await cache.set('key1', 'value1');
      const result = await cache.get('key1');
      expect(result).toBe('value1');
    });

    it('should prefix namespace to keys', async () => {
      await cache.set('key1', 'value1');
      const backend = cache.getBackend() as MemoryBackend<string>;
      const keys = await backend.keys();
      expect(keys).toContain('test:key1');
    });

    it('should return null for non-existent key', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      await cache.set('key1', 'value1');
      const deleted = await cache.delete('key1');
      expect(deleted).toBe(true);
      expect(await cache.get('key1')).toBeNull();
    });

    it('should clear all keys in namespace', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });
  });

  describe('Bulk Operations', () => {
    it('should get many values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      const results = await cache.getMany(['key1', 'key2', 'key3', 'missing']);
      expect(results).toEqual(['value1', 'value2', 'value3', null]);
    });

    it('should set many values', async () => {
      await cache.setMany([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ]);
      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBe('value2');
      expect(await cache.get('key3')).toBe('value3');
    });

    it('should delete many keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      const deleted = await cache.deleteMany(['key1', 'key2', 'missing']);
      expect(deleted).toBe(2);
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBe('value3');
    });
  });

  describe('TTL', () => {
    it('should use default TTL', async () => {
      await cache.set('key1', 'value1');
      const ttl = await cache.getTtl('key1');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60_000);
    });

    it('should override default TTL', async () => {
      await cache.set('key1', 'value1', 120_000);
      const ttl = await cache.getTtl('key1');
      expect(ttl).toBeGreaterThan(59_000);
      expect(ttl).toBeLessThanOrEqual(120_000);
    });

    it('should set persistent TTL when null', async () => {
      await cache.set('key1', 'value1', null);
      const ttl = await cache.getTtl('key1');
      expect(ttl).toBe(-1);
    });

    it('should extend TTL', async () => {
      await cache.set('key1', 'value1', 10_000);
      const extended = await cache.extendTtl('key1', 60_000);
      expect(extended).toBe(true);
      const ttl = await cache.getTtl('key1');
      expect(ttl).toBeGreaterThan(50_000);
    });
  });

  describe('getOrFetch', () => {
    it('should return cached value on subsequent calls', async () => {
      let fetchCount = 0;
      const fetcher = async () => {
        fetchCount++;
        return `value${fetchCount}`;
      };

      const result1 = await cache.getOrFetch('key1', fetcher);
      const result2 = await cache.getOrFetch('key1', fetcher);

      expect(result1).toBe('value1');
      expect(result2).toBe('value1');
      expect(fetchCount).toBe(1);
    });

    it('should fetch on cache miss', async () => {
      const fetcher = async () => 'fetched';
      const result = await cache.getOrFetch('newkey', fetcher);
      expect(result).toBe('fetched');
    });

    it('should use custom TTL from options', async () => {
      const fetcher = async () => 'value';
      await cache.getOrFetch('key1', fetcher, { ttl: 120_000 });
      const ttl = await cache.getTtl('key1');
      expect(ttl).toBeGreaterThan(100_000);
    });
  });

  describe('Metrics', () => {
    it('should track hits and misses', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1'); // hit
      await cache.get('key2'); // miss

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.gets).toBe(2);
    });

    it('should track sets', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      const metrics = cache.getMetrics();
      expect(metrics.sets).toBe(2);
    });

    it('should track deletes', async () => {
      await cache.set('key1', 'value1');
      await cache.delete('key1');
      const metrics = cache.getMetrics();
      expect(metrics.deletes).toBe(1);
    });

    it('should track clears', async () => {
      await cache.set('key1', 'value1');
      await cache.clear();
      const metrics = cache.getMetrics();
      expect(metrics.clears).toBe(1);
    });

    it('should calculate average durations', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');
      const metrics = cache.getMetrics();
      expect(metrics.avgGetDuration).toBeGreaterThanOrEqual(0);
      expect(metrics.avgSetDuration).toBeGreaterThanOrEqual(0);
    });

    it('should reset metrics', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');
      cache.resetMetrics();
      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.gets).toBe(0);
      expect(metrics.sets).toBe(0);
    });

    it('should include backend stats', async () => {
      await cache.set('key1', 'value1');
      const metrics = cache.getMetrics();
      expect(metrics.backend).toBeDefined();
    });
  });

  describe('has()', () => {
    it('should return true for existing key', async () => {
      await cache.set('key1', 'value1');
      expect(await cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      expect(await cache.has('nonexistent')).toBe(false);
    });
  });

  describe('keys()', () => {
    it('should list keys without namespace prefix', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      const keys = await cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.every((k) => !k.includes(':'))).toBe(true);
    });

    it('should match pattern without namespace prefix', async () => {
      await cache.set('user:1', 'value1');
      await cache.set('user:2', 'value2');
      await cache.set('admin:1', 'value3');
      const keys = await cache.keys('user:*');
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
      expect(keys).not.toContain('admin:1');
    });
  });

  describe('getNamespace()', () => {
    it('should return the namespace', () => {
      expect(cache.getNamespace()).toBe('test');
    });
  });

  describe('isMetricsEnabled()', () => {
    it('should return true when metrics enabled', () => {
      expect(cache.isMetricsEnabled()).toBe(true);
    });
  });

  describe('getBackend()', () => {
    it('should return the backend instance', () => {
      const backend = cache.getBackend();
      expect(backend).toBeInstanceOf(MemoryBackend);
    });
  });
});
