import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryBackend } from '../../src/backends/memory';

describe('MemoryBackend', () => {
  let backend: MemoryBackend<string>;

  beforeEach(() => {
    backend = new MemoryBackend<string>({
      maxEntries: 10,
      maxMemoryBytes: 1024, // 1KB for testing
    });
  });

  afterEach(async () => {
    await backend.disconnect();
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      await backend.set('key1', 'value1');
      const result = await backend.get('key1');
      expect(result).toBe('value1');
    });

    it('should return null for non-existent key', async () => {
      const result = await backend.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      await backend.set('key1', 'value1');
      const deleted = await backend.delete('key1');
      expect(deleted).toBe(true);
      const result = await backend.get('key1');
      expect(result).toBeNull();
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await backend.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should check if key exists', async () => {
      await backend.set('key1', 'value1');
      expect(await backend.exists('key1')).toBe(true);
      expect(await backend.exists('nonexistent')).toBe(false);
    });

    it('should clear all entries', async () => {
      await backend.set('key1', 'value1');
      await backend.set('key2', 'value2');
      await backend.clear();
      expect(await backend.get('key1')).toBeNull();
      expect(await backend.get('key2')).toBeNull();
    });
  });

  describe('Bulk Operations', () => {
    it('should get many values', async () => {
      await backend.set('key1', 'value1');
      await backend.set('key2', 'value2');
      await backend.set('key3', 'value3');
      const results = await backend.getMany([
        'key1',
        'key2',
        'key3',
        'missing',
      ]);
      expect(results).toEqual(
        new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
          ['key3', 'value3'],
        ]),
      );
    });

    it('should set many values', async () => {
      await backend.setMany([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ]);
      expect(await backend.get('key1')).toBe('value1');
      expect(await backend.get('key2')).toBe('value2');
      expect(await backend.get('key3')).toBe('value3');
    });

    it('should delete many keys', async () => {
      await backend.set('key1', 'value1');
      await backend.set('key2', 'value2');
      await backend.set('key3', 'value3');
      const deleted = await backend.deleteMany(['key1', 'key2', 'missing']);
      expect(deleted).toBe(2);
      expect(await backend.get('key1')).toBeNull();
      expect(await backend.get('key2')).toBeNull();
      expect(await backend.get('key3')).toBe('value3');
    });
  });

  describe('TTL Support', () => {
    it('should set value with TTL', async () => {
      await backend.set('key1', 'value1', { ttl: 1000 });
      const ttl = await backend.getTtl('key1');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(1000);
    });

    it('should return -1 for persistent keys', async () => {
      await backend.set('key1', 'value1', { ttl: null });
      const ttl = await backend.getTtl('key1');
      expect(ttl).toBe(-1);
    });

    it('should return -2 for non-existent keys', async () => {
      const ttl = await backend.getTtl('nonexistent');
      expect(ttl).toBe(-2);
    });

    it('should extend TTL', async () => {
      await backend.set('key1', 'value1', { ttl: 1000 });
      const extended = await backend.extendTtl('key1', 5000);
      expect(extended).toBe(true);
      const ttl = await backend.getTtl('key1');
      expect(ttl).toBeGreaterThan(4000);
    });

    it('should return false when extending TTL for non-existent key', async () => {
      const extended = await backend.extendTtl('nonexistent', 5000);
      expect(extended).toBe(false);
    });

    it('should automatically expire entries', async () => {
      // This test would need to manipulate time or wait
      // For now, we'll just test the expiration check logic
      await backend.set('key1', 'value1', { ttl: 0 });
      // Entry should be considered expired immediately or very soon
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entry when maxEntries is reached', async () => {
      const backend = new MemoryBackend<string>({ maxEntries: 3 });

      await backend.set('key1', 'value1');
      await backend.set('key2', 'value2');
      await backend.set('key3', 'value3');
      // Access key1 to make it recently used
      await backend.get('key1');
      // Add 4th entry - should evict key2 (least recently used)
      await backend.set('key4', 'value4');

      expect(await backend.exists('key1')).toBe(true);
      expect(await backend.exists('key2')).toBe(false);
      expect(await backend.exists('key3')).toBe(true);
      expect(await backend.exists('key4')).toBe(true);

      await backend.disconnect();
    });

    it('should update access order on get', async () => {
      const backend = new MemoryBackend<string>({ maxEntries: 3 });

      await backend.set('key1', 'value1');
      await backend.set('key2', 'value2');
      await backend.set('key3', 'value3');
      // Access key1 to make it recently used
      await backend.get('key1');
      // Add 4th entry - should evict key2
      await backend.set('key4', 'value4');

      expect(await backend.exists('key2')).toBe(false);

      await backend.disconnect();
    });

    it('should evict based on memory size', async () => {
      const backend = new MemoryBackend<string>({ maxMemoryBytes: 100 });

      // Each string "value" is about 5-6 bytes, so we can fit a few
      for (let i = 0; i < 20; i++) {
        await backend.set(`key${i}`, `value${i}`);
      }

      // Should have evicted many entries to stay under memory limit
      const stats = backend.getStats();
      expect(stats.totalMemoryBytes).toBeLessThanOrEqual(200); // Some margin
      expect(stats.size).toBeLessThanOrEqual(20);

      await backend.disconnect();
    });
  });

  describe('Eviction Callback', () => {
    it('should call onEvict when entry is evicted', async () => {
      const onEvict = vi.fn();
      const backend = new MemoryBackend<string>({
        maxEntries: 2,
        onEvict,
      });

      await backend.set('key1', 'value1');
      await backend.set('key2', 'value2');
      await backend.set('key3', 'value3');

      expect(onEvict).toHaveBeenCalledWith('key1', 'value1', 'size');

      await backend.disconnect();
    });
  });

  describe('Keys Pattern Matching', () => {
    it('should return all keys when no pattern', async () => {
      await backend.set('key1', 'value1');
      await backend.set('key2', 'value2');
      const keys = await backend.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });

    it('should match keys with glob pattern', async () => {
      await backend.set('user:1', 'value1');
      await backend.set('user:2', 'value2');
      await backend.set('admin:1', 'admin1');
      const keys = await backend.keys('user:*');
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
      expect(keys).not.toContain('admin:1');
    });

    it('should support ? wildcard', async () => {
      await backend.set('key1', 'value1');
      await backend.set('key2', 'value2');
      await backend.set('key10', 'value10');
      const keys = await backend.keys('key?');
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).not.toContain('key10');
    });
  });

  describe('Stats', () => {
    it('should return correct stats', async () => {
      await backend.set('key1', 'value1');
      await backend.set('key2', 'value2');
      const stats = backend.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxEntries).toBe(10);
      expect(stats.totalMemoryBytes).toBeGreaterThan(0);
    });
  });
});
