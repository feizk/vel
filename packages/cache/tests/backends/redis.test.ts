import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedisBackend } from '../../src/backends/redis';

// Mock ioredis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  mget: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  keys: vi.fn(),
  ttl: vi.fn(),
  pexpire: vi.fn(),
  pipeline: vi.fn(() => ({
    set: vi.fn(),
    del: vi.fn(),
    exec: vi.fn(),
  })),
  on: vi.fn(),
  quit: vi.fn(),
  status: 'ready',
};

vi.mock('ioredis', () => ({
  Redis: vi.fn(() => mockRedis),
}));

describe('RedisBackend', () => {
  let backend: RedisBackend<string>;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    mockRedis.status = 'ready';

    backend = new RedisBackend<string>({
      url: 'redis://localhost:6379',
      keyPrefix: 'test:',
    });
  });

  afterEach(async () => {
    await backend.disconnect();
  });

  describe('Basic Operations', () => {
    it('should set a value', async () => {
      mockRedis.set.mockResolvedValue('OK');
      await backend.set('key1', 'value1');
      // When no TTL is provided, set is called with 2 arguments (key, value)
      expect(mockRedis.set).toHaveBeenCalledWith(
        'test:key1',
        expect.any(String),
      );
    });

    it('should set a value with TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');
      await backend.set('key1', 'value1', { ttl: 5000 });
      expect(mockRedis.set).toHaveBeenCalledWith(
        'test:key1',
        expect.any(String),
        'PX',
        5000,
      );
    });

    it('should get a value', async () => {
      mockRedis.get.mockResolvedValue('"serialized"');
      // We need to mock the serializer to work with this
      // For now, we'll just test that the Redis client is called correctly
      await backend.get('key1');
      expect(mockRedis.get).toHaveBeenCalledWith('test:key1');
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await backend.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      mockRedis.del.mockResolvedValue(1);
      const result = await backend.delete('key1');
      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('test:key1');
    });

    it('should return false when deleting non-existent key', async () => {
      mockRedis.del.mockResolvedValue(0);
      const result = await backend.delete('nonexistent');
      expect(result).toBe(false);
    });

    it('should check if key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);
      const result = await backend.exists('key1');
      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('test:key1');
    });
  });

  describe('Bulk Operations', () => {
    it('should get many values', async () => {
      mockRedis.mget.mockResolvedValue(['"value1"', '"value2"', null]);
      const result = await backend.getMany(['key1', 'key2', 'missing']);
      expect(result.size).toBe(2);
      expect(result.get('key1')).toBe('value1');
      expect(result.get('key2')).toBe('value2');
      expect(result.has('missing')).toBe(false);
    });

    it('should set many values', async () => {
      mockRedis.pipeline.mockReturnValue({
        set: vi.fn(),
        del: vi.fn(),
        exec: vi.fn().mockResolvedValue([]),
      });

      await backend.setMany([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should delete many keys', async () => {
      mockRedis.del.mockResolvedValue(2);
      const result = await backend.deleteMany(['key1', 'key2', 'key3']);
      expect(result).toBe(2);
      expect(mockRedis.del).toHaveBeenCalledWith(
        'test:key1',
        'test:key2',
        'test:key3',
      );
    });
  });

  describe('TTL Operations', () => {
    it('should get TTL', async () => {
      mockRedis.ttl.mockResolvedValue(100);
      const result = await backend.getTtl('key1');
      expect(result).toBe(100 * 1000); // Converted to milliseconds
      expect(mockRedis.ttl).toHaveBeenCalledWith('test:key1');
    });

    it('should return -1 for persistent keys', async () => {
      mockRedis.ttl.mockResolvedValue(-1);
      const result = await backend.getTtl('key1');
      expect(result).toBe(-1);
    });

    it('should return -2 for non-existent keys', async () => {
      mockRedis.ttl.mockResolvedValue(-2);
      const result = await backend.getTtl('nonexistent');
      expect(result).toBe(-2);
    });

    it('should extend TTL', async () => {
      mockRedis.pexpire.mockResolvedValue(1);
      const result = await backend.extendTtl('key1', 5000);
      expect(result).toBe(true);
      expect(mockRedis.pexpire).toHaveBeenCalledWith('test:key1', 5000);
    });

    it('should return false when extending TTL for non-existent key', async () => {
      mockRedis.pexpire.mockResolvedValue(0);
      const result = await backend.extendTtl('nonexistent', 5000);
      expect(result).toBe(false);
    });
  });

  describe('Clear', () => {
    it('should clear all keys with prefix', async () => {
      mockRedis.keys.mockResolvedValue(['test:key1', 'test:key2']);
      mockRedis.pipeline.mockReturnValue({
        set: vi.fn(),
        del: vi.fn(),
        exec: vi.fn().mockResolvedValue([]),
      });

      await backend.clear();

      expect(mockRedis.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should handle empty result from keys', async () => {
      mockRedis.keys.mockResolvedValue([]);
      await backend.clear();
      expect(mockRedis.keys).toHaveBeenCalledWith('test:*');
    });
  });

  describe('Keys', () => {
    it('should list keys with pattern', async () => {
      mockRedis.keys.mockResolvedValue(['test:user:1', 'test:user:2']);
      const result = await backend.keys('user:*');
      expect(result).toEqual(['user:1', 'user:2']);
    });

    it('should list all keys when no pattern', async () => {
      mockRedis.keys.mockResolvedValue(['test:key1', 'test:key2']);
      const result = await backend.keys();
      expect(result).toEqual(['key1', 'key2']);
    });
  });

  describe('Stats', () => {
    it('should return connection status', () => {
      const stats = backend.getStats();
      expect(stats.connected).toBe(true);
      expect(stats.keyPrefix).toBe('test:');
    });
  });

  describe('Error Handling', () => {
    it('should wrap Redis errors in CacheError', async () => {
      mockRedis.get.mockRejectedValue(new Error('Connection lost'));
      await expect(backend.get('key1')).rejects.toThrow(
        'Redis operation failed',
      );
    });
  });
});
