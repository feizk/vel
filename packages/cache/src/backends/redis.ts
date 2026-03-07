/**
 * Redis cache backend using ioredis.
 * @module backends/redis
 */

import { Redis } from 'ioredis';
import type { CacheBackend, SetOptions, RedisBackendOptions } from '../types';
import type { Serializer } from '../serializers/interface';
import { createJsonSerializer } from '../serializers/json';
import { CacheError } from '../types';

/**
 * Redis cache backend implementation using ioredis.
 *
 * Features:
 * - Async operations with promises
 * - Native TTL support via Redis EX/PX flags
 * - Automatic serialization/deserialization
 * - Connection pooling via ioredis
 * - Cluster-ready (ioredis supports cluster mode)
 * - Retry logic for connection failures
 *
 * @example
 * ```typescript
 * const backend = new RedisBackend({
 *   url: 'redis://localhost:6379',
 *   keyPrefix: 'myapp:',
 *   retryStrategy: (times) => Math.min(times * 100, 1000)
 * });
 * ```
 */
export class RedisBackend<T> implements CacheBackend<T> {
  private readonly client: Redis;
  private readonly serializer: Serializer<T>;
  private readonly keyPrefix: string;

  /**
   * Create a new RedisBackend instance.
   * @param options - Configuration options
   */
  constructor(options: RedisBackendOptions = {}, serializer?: Serializer<T>) {
    this.serializer =
      serializer ?? (createJsonSerializer<T>() as Serializer<T>);
    this.keyPrefix = options.keyPrefix ?? '';

    // Create or use provided Redis client
    if (options.client) {
      this.client = options.client;
    } else {
      // Connect using URL directly or default
      const url = options.url ?? 'redis://localhost:6379';
      this.client = new Redis(url, {
        retryStrategy:
          options.retryStrategy ?? ((times) => Math.min(times * 100, 1000)),
        maxRetriesPerRequest: 3,
      });
    }

    // Handle connection errors
    this.client.on('error', (err) => {
      console.error('RedisBackend connection error:', err);
    });

    this.client.on('end', () => {
      console.log('RedisBackend connection closed');
    });
  }

  /**
   * Build a full Redis key with prefix.
   */
  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Wrap Redis errors in CacheError.
   */
  private handleError(error: unknown, context: string): never {
    throw new CacheError(
      `Redis operation failed: ${context}`,
      'REDIS_ERROR',
      error,
    );
  }

  /**
   * Get a value by key.
   * @param key - The cache key
   * @returns The cached value or null if not found
   */
  async get(key: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key);
      const data = await this.client.get(fullKey);
      if (data === null) return null;
      return this.serializer.deserialize(data);
    } catch (error) {
      this.handleError(error, `get(${key})`);
    }
  }

  /**
   * Get multiple values by keys.
   * @param keys - Array of cache keys
   * @returns Map of key to value (only includes found keys)
   */
  async getMany(keys: string[]): Promise<Map<string, T>> {
    try {
      const fullKeys = keys.map((k) => this.buildKey(k));
      const results = await this.client.mget(...fullKeys);
      const map = new Map<string, T>();

      results.forEach((value, index) => {
        if (value !== null) {
          try {
            const deserialized = this.serializer.deserialize(value);
            map.set(keys[index], deserialized);
          } catch {
            // Skip entries that fail to deserialize
          }
        }
      });

      return map;
    } catch (error) {
      this.handleError(error, `getMany(${keys.length} keys)`);
    }
  }

  /**
   * Store a value with optional TTL.
   * @param key - The cache key
   * @param value - The value to store
   * @param options - Optional TTL in milliseconds
   */
  async set(key: string, value: T, options?: SetOptions): Promise<void> {
    try {
      const fullKey = this.buildKey(key);
      const serialized = this.serializer.serialize(value);

      if (
        options?.ttl !== null &&
        options?.ttl !== undefined &&
        options.ttl > 0
      ) {
        // Use milliseconds TTL (PX flag)
        await this.client.set(fullKey, serialized, 'PX', options.ttl);
      } else {
        await this.client.set(fullKey, serialized);
      }
    } catch (error) {
      this.handleError(error, `set(${key})`);
    }
  }

  /**
   * Store multiple key-value pairs with optional TTL.
   * @param entries - Array of [key, value] pairs
   * @param options - Optional TTL in milliseconds
   */
  async setMany(entries: [string, T][], options?: SetOptions): Promise<void> {
    if (entries.length === 0) return;

    try {
      const pipeline = this.client.pipeline();

      for (const [key, value] of entries) {
        const fullKey = this.buildKey(key);
        try {
          const serialized = this.serializer.serialize(value);

          if (
            options?.ttl !== null &&
            options?.ttl !== undefined &&
            options.ttl > 0
          ) {
            pipeline.set(fullKey, serialized, 'PX', options.ttl);
          } else {
            pipeline.set(fullKey, serialized);
          }
        } catch {
          // Skip entries that fail to serialize
        }
      }

      await pipeline.exec();
    } catch (error) {
      this.handleError(error, `setMany(${entries.length} entries)`);
    }
  }

  /**
   * Delete a key.
   * @param key - The cache key
   * @returns true if the key was deleted, false if it didn't exist
   */
  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const result = await this.client.del(fullKey);
      return result === 1;
    } catch (error) {
      this.handleError(error, `delete(${key})`);
    }
  }

  /**
   * Delete multiple keys.
   * @param keys - Array of cache keys
   * @returns Number of keys that were deleted
   */
  async deleteMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;

    try {
      const fullKeys = keys.map((k) => this.buildKey(k));
      const result = await this.client.del(...fullKeys);
      return result;
    } catch (error) {
      this.handleError(error, `deleteMany(${keys.length} keys)`);
    }
  }

  /**
   * Check if a key exists.
   * @param key - The cache key
   * @returns true if the key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.handleError(error, `exists(${key})`);
    }
  }

  /**
   * Clear all cache entries matching the key prefix.
   * WARNING: This will delete ALL keys with the configured prefix!
   */
  async clear(): Promise<void> {
    try {
      const pattern = this.buildKey('*');
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        // Use pipeline for better performance with many keys
        const pipeline = this.client.pipeline();
        for (const key of keys) {
          pipeline.del(key);
        }
        await pipeline.exec();
      }
    } catch (error) {
      this.handleError(error, 'clear()');
    }
  }

  /**
   * Get all keys matching a pattern.
   * @param pattern - Glob-style pattern (default: all keys with prefix)
   * @returns Array of matching keys (without prefix)
   */
  async keys(pattern?: string): Promise<string[]> {
    try {
      const fullPattern = pattern ? this.buildKey(pattern) : this.buildKey('*');
      const keys = await this.client.keys(fullPattern);

      // Remove prefix from keys
      const prefixLength = this.keyPrefix.length;
      return keys.map((key) => key.substring(prefixLength));
    } catch (error) {
      this.handleError(error, `keys(${pattern})`);
    }
  }

  /**
   * Get the TTL for a key in milliseconds.
   * @param key - The cache key
   * @returns TTL in ms, -1 for persistent (no expiry), -2 if key doesn't exist
   */
  async getTtl(key: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key);
      const ttl = await this.client.ttl(fullKey);
      // Redis TTL returns seconds, convert to milliseconds
      // -2: key does not exist
      // -1: key exists but has no expiration
      return ttl === -1 ? -1 : ttl === -2 ? -2 : ttl * 1000;
    } catch (error) {
      this.handleError(error, `getTtl(${key})`);
    }
  }

  /**
   * Extend the TTL of an existing key.
   * @param key - The cache key
   * @param ttl - New TTL in milliseconds from now
   * @returns true if TTL was extended, false if key doesn't exist
   */
  async extendTtl(key: string, ttl: number): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const result = await this.client.pexpire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      this.handleError(error, `extendTtl(${key})`);
    }
  }

  /**
   * Get Redis client statistics.
   */
  getStats(): {
    connected: boolean;
    keyPrefix: string;
  } {
    return {
      connected: this.client.status === 'ready',
      keyPrefix: this.keyPrefix,
    };
  }

  /**
   * Close the Redis connection.
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

/**
 * Create a new RedisBackend instance.
 * @param options - Configuration options
 * @returns A new RedisBackend instance
 */
export function createRedisBackend<T>(
  options: RedisBackendOptions = {},
  serializer?: Serializer<T>,
): RedisBackend<T> {
  return new RedisBackend<T>(options, serializer);
}
