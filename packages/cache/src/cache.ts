/**
 * Main Cache class providing a type-safe interface to cache backends.
 * @module cache
 */

import type {
  CacheBackend,
  CacheOptions,
  CacheMetrics,
  SetOptions,
  FetchOptions,
} from './types';
import { CacheError } from './types';
import type { Serializer } from './serializers/interface';
import { createJsonSerializer } from './serializers/json';

/**
 * Main cache class that wraps a backend and provides a rich API.
 *
 * Features:
 * - Type-safe operations with generics
 * - Namespace prefixing for key isolation
 * - Default TTL configuration
 * - Custom serialization support
 * - Metrics collection
 * - getOrFetch with stale-while-revalidate
 *
 * @template T - The type of values stored in the cache
 *
 * @example
 * ```typescript
 * const cache = new Cache<string>({
 *   backend: new MemoryBackend({ maxEntries: 1000 }),
 *   namespace: 'myapp',
 *   defaultTtl: 5 * 60 * 1000 // 5 minutes
 * });
 *
 * await cache.set('key', 'value');
 * const value = await cache.get('key'); // 'value' | null
 * ```
 */
export class Cache<T> {
  private readonly backend: CacheBackend<T>;
  private readonly namespace: string;
  private readonly defaultTtl: number | undefined;
  private readonly serializer: Serializer<T>;
  private readonly customDeserializer?: (data: Buffer | string) => T;
  private readonly enableMetrics: boolean;

  // Metrics tracking
  private hits: number = 0;
  private misses: number = 0;
  private gets: number = 0;
  private sets: number = 0;
  private deletes: number = 0;
  private clears: number = 0;
  private totalGetDuration: number = 0;
  private totalSetDuration: number = 0;

  /**
   * Create a new Cache instance.
   * @param options - Cache configuration options
   */
  constructor(options: CacheOptions<T>) {
    this.backend = options.backend;
    this.namespace = options.namespace ?? '';
    this.defaultTtl = options.defaultTtl;
    this.enableMetrics = options.enableMetrics ?? false;

    // Use custom serializer or default to JSON
    if (options.serialize || options.deserialize) {
      this.serializer = {
        serialize:
          options.serialize ??
          ((value) => JSON.stringify(value) as Buffer | string),
        deserialize:
          options.deserialize ?? ((data) => JSON.parse(data as string) as T),
        getSize: options.serialize
          ? (value) => Buffer.byteLength(options.serialize!(value), 'utf8')
          : undefined,
      };
      this.customDeserializer = options.deserialize;
    } else {
      this.serializer = createJsonSerializer<T>() as Serializer<T>;
      this.customDeserializer = undefined;
    }
  }

  /**
   * Build the full key with namespace prefix.
   */
  private buildKey(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }

  /**
   * Start timing an operation.
   */
  private startTimer(): bigint {
    return process.hrtime.bigint();
  }

  /**
   * End timing and return duration in milliseconds.
   */
  private endTimer(start: bigint): number {
    const end = process.hrtime.bigint();
    return Number(end - start) / 1_000_000;
  }

  /**
   * Record a get operation result.
   */
  private recordGet(hit: boolean, duration: number): void {
    if (!this.enableMetrics) return;
    this.gets++;
    if (hit) this.hits++;
    else this.misses++;
    this.totalGetDuration += duration;
  }

  /**
   * Record a set operation.
   */
  private recordSet(duration: number): void {
    if (!this.enableMetrics) return;
    this.sets++;
    this.totalSetDuration += duration;
  }

  /**
   * Record a delete operation.
   */
  private recordDelete(): void {
    if (!this.enableMetrics) return;
    this.deletes++;
  }

  /**
   * Record a clear operation.
   */
  private recordClear(): void {
    if (!this.enableMetrics) return;
    this.clears++;
  }

  /**
   * Get a value by key.
   * @param key - The cache key (without namespace prefix)
   * @returns The cached value or null if not found
   */
  async get(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    let start: bigint | undefined;
    if (this.enableMetrics) start = process.hrtime.bigint();

    try {
      const value = await this.backend.get(fullKey);
      if (this.enableMetrics && start !== undefined) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000;
        this.recordGet(value !== null, duration);
      }
      return value;
    } catch (error) {
      if (this.enableMetrics && start !== undefined) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000;
        this.recordGet(false, duration);
      }
      throw this.wrapError(error, `get(${key})`);
    }
  }

  /**
   * Store a value with optional TTL.
   * @param key - The cache key (without namespace prefix)
   * @param value - The value to store
   * @param ttl - Time-to-live in milliseconds (overrides default, null for persistent)
   */
  async set(key: string, value: T, ttl?: number | null): Promise<void> {
    const fullKey = this.buildKey(key);
    let start: bigint | undefined;
    if (this.enableMetrics) start = process.hrtime.bigint();

    try {
      const options: SetOptions = {
        ttl: ttl === undefined ? this.defaultTtl : ttl,
      };
      await this.backend.set(fullKey, value, options);
      if (this.enableMetrics && start !== undefined) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000;
        this.recordSet(duration);
      }
    } catch (error) {
      if (this.enableMetrics && start !== undefined) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000;
        this.recordSet(duration);
      }
      throw this.wrapError(error, `set(${key})`);
    }
  }

  /**
   * Delete a key.
   * @param key - The cache key (without namespace prefix)
   * @returns true if the key was deleted, false if it didn't exist
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    try {
      const result = await this.backend.delete(fullKey);
      if (result) this.recordDelete();
      return result;
    } catch (error) {
      throw this.wrapError(error, `delete(${key})`);
    }
  }

  /**
   * Clear all cache entries in this namespace.
   * WARNING: This deletes all keys with the namespace prefix!
   */
  async clear(): Promise<void> {
    try {
      await this.backend.clear();
      this.recordClear();
    } catch (error) {
      throw this.wrapError(error, 'clear()');
    }
  }

  /**
   * Get multiple values by keys.
   * @param keys - Array of cache keys (without namespace prefix)
   * @returns Array of values (null for misses) in the same order
   */
  async getMany(keys: string[]): Promise<(T | null)[]> {
    const fullKeys = keys.map((k) => this.buildKey(k));
    let start: bigint | undefined;
    if (this.enableMetrics) start = process.hrtime.bigint();

    try {
      const map = await this.backend.getMany(fullKeys);
      const result: (T | null)[] = keys.map((key) => {
        const fullKey = this.buildKey(key);
        const value = map.get(fullKey);
        if (value !== undefined) {
          if (this.enableMetrics) this.hits++;
          return value;
        } else {
          if (this.enableMetrics) this.misses++;
          return null;
        }
      });

      if (this.enableMetrics && start !== undefined) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000;
        this.gets += keys.length;
        this.totalGetDuration += duration;
      }

      return result;
    } catch (error) {
      if (this.enableMetrics && start !== undefined) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000;
        this.gets += keys.length;
        this.totalGetDuration += duration;
        this.misses += keys.length;
      }
      throw this.wrapError(error, `getMany(${keys.length} keys)`);
    }
  }

  /**
   * Store multiple key-value pairs with optional TTL.
   * @param entries - Array of [key, value] pairs (keys without namespace prefix)
   * @param ttl - Time-to-live in milliseconds (overrides default, null for persistent)
   */
  async setMany(entries: [string, T][], ttl?: number | null): Promise<void> {
    const fullEntries = entries.map(
      ([key, value]) => [this.buildKey(key), value] as [string, T],
    );
    let start: bigint | undefined;
    if (this.enableMetrics) start = process.hrtime.bigint();

    try {
      const options: SetOptions = {
        ttl: ttl === undefined ? this.defaultTtl : ttl,
      };
      await this.backend.setMany(fullEntries, options);
      if (this.enableMetrics && start !== undefined) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000;
        this.sets += entries.length;
        this.totalSetDuration += duration;
      }
    } catch (error) {
      if (this.enableMetrics && start !== undefined) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000;
        this.totalSetDuration += duration;
      }
      throw this.wrapError(error, `setMany(${entries.length} entries)`);
    }
  }

  /**
   * Delete multiple keys.
   * @param keys - Array of cache keys (without namespace prefix)
   * @returns Number of keys that were deleted
   */
  async deleteMany(keys: string[]): Promise<number> {
    const fullKeys = keys.map((k) => this.buildKey(k));
    try {
      const result = await this.backend.deleteMany(fullKeys);
      if (result > 0) this.recordDelete();
      return result;
    } catch (error) {
      throw this.wrapError(error, `deleteMany(${keys.length} keys)`);
    }
  }

  /**
   * Check if a key exists.
   * @param key - The cache key (without namespace prefix)
   * @returns true if the key exists
   */
  async has(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    try {
      return await this.backend.exists(fullKey);
    } catch (error) {
      throw this.wrapError(error, `has(${key})`);
    }
  }

  /**
   * Get all keys matching a pattern.
   * @param pattern - Glob pattern (without namespace prefix)
   * @returns Array of matching keys (without namespace prefix)
   */
  async keys(pattern?: string): Promise<string[]> {
    const fullPattern = pattern ? this.buildKey(pattern) : undefined;
    try {
      const keys = await this.backend.keys(fullPattern);
      // Remove namespace prefix from results
      const prefixLength = this.namespace ? this.namespace.length + 1 : 0;
      return keys.map((key) => key.substring(prefixLength));
    } catch (error) {
      throw this.wrapError(error, `keys(${pattern})`);
    }
  }

  /**
   * Get the TTL for a key in milliseconds.
   * @param key - The cache key (without namespace prefix)
   * @returns TTL in ms, -1 for persistent, -2 if missing
   */
  async getTtl(key: string): Promise<number> {
    const fullKey = this.buildKey(key);
    try {
      return await this.backend.getTtl(fullKey);
    } catch (error) {
      throw this.wrapError(error, `getTtl(${key})`);
    }
  }

  /**
   * Extend the TTL of an existing key.
   * @param key - The cache key (without namespace prefix)
   * @param ttl - New TTL in milliseconds from now
   * @returns true if TTL was extended, false if key doesn't exist
   */
  async extendTtl(key: string, ttl: number): Promise<boolean> {
    const fullKey = this.buildKey(key);
    try {
      return (await this.backend.extendTtl?.(fullKey, ttl)) ?? false;
    } catch (error) {
      throw this.wrapError(error, `extendTtl(${key})`);
    }
  }

  /**
   * Get a value from cache or fetch it if missing.
   * Implements the cache-aside pattern with optional stale-while-revalidate.
   *
   * @param key - The cache key (without namespace prefix)
   * @param fetcher - Async function that fetches the value on cache miss
   * @param options - Optional fetch options (ttl, staleWhileRevalidate)
   * @returns The cached or freshly fetched value
   *
   * @example
   * ```typescript
   * const user = await cache.getOrFetch(
   *   `user:${userId}`,
   *   async () => await db.users.findById(userId),
   *   { ttl: 10 * 60 * 1000 } // 10 minutes
   * );
   * ```
   */
  async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    options: FetchOptions = {},
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      // If stale-while-revalidate is enabled, fetch in background
      if (options.staleWhileRevalidate) {
        this.getOrFetch(key, fetcher, { ttl: options.ttl }).catch(() => {
          // Ignore background fetch errors
        });
      }
      return cached;
    }

    // Cache miss - fetch and store
    const value = await fetcher();
    const ttl = options.ttl ?? this.defaultTtl;
    if (ttl !== null && ttl !== undefined) {
      await this.set(key, value, ttl);
    } else {
      await this.set(key, value);
    }

    return value;
  }

  /**
   * Get current cache metrics.
   * @returns CacheMetrics object with hit/miss rates and operation counts
   */
  getMetrics(): CacheMetrics {
    return {
      hits: this.hits,
      misses: this.misses,
      gets: this.gets,
      sets: this.sets,
      deletes: this.deletes,
      clears: this.clears,
      avgGetDuration: this.gets > 0 ? this.totalGetDuration / this.gets : 0,
      avgSetDuration: this.sets > 0 ? this.totalSetDuration / this.sets : 0,
      totalGetDuration: this.totalGetDuration,
      totalSetDuration: this.totalSetDuration,
      backend:
        this.backend instanceof MemoryBackend
          ? (this.backend as MemoryBackend<T>).getStats()
          : this.backend instanceof RedisBackend
            ? (this.backend as RedisBackend<T>).getStats()
            : {},
    };
  }

  /**
   * Reset all metrics to zero.
   */
  resetMetrics(): void {
    this.hits = 0;
    this.misses = 0;
    this.gets = 0;
    this.sets = 0;
    this.deletes = 0;
    this.clears = 0;
    this.totalGetDuration = 0;
    this.totalSetDuration = 0;
  }

  /**
   * Wrap errors with cache context.
   */
  private wrapError(error: unknown, context: string): CacheError {
    if (error instanceof CacheError) {
      return new CacheError(
        `${context}: ${error.message}`,
        error.code,
        error.cause,
      );
    }
    return new CacheError(
      `${context}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'CACHE_ERROR',
      error,
    );
  }

  /**
   * Get the underlying backend instance.
   * Useful for backend-specific operations and testing.
   */
  getBackend(): CacheBackend<T> {
    return this.backend;
  }

  /**
   * Get the namespace prefix.
   */
  getNamespace(): string {
    return this.namespace;
  }

  /**
   * Check if metrics collection is enabled.
   */
  isMetricsEnabled(): boolean {
    return this.enableMetrics;
  }
}

// Import backends for instanceof checks
import { MemoryBackend } from './backends/memory';
import { RedisBackend } from './backends/redis';
