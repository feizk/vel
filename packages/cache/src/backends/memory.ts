/**
 * In-memory LRU cache backend.
 * @module backends/memory
 */

import type {
  CacheBackend,
  SetOptions,
  MemoryBackendOptions,
  CacheEntry,
} from '../types';
import type { Serializer } from '../serializers/interface';
import { createJsonSerializer } from '../serializers/json';

/**
 * In-memory LRU (Least Recently Used) cache backend.
 *
 * Features:
 * - LRU eviction based on maxEntries or maxMemoryBytes
 * - Optional TTL support with background cleanup
 * - Fast synchronous operations using Map
 * - Eviction callback support
 *
 * @example
 * ```typescript
 * const backend = new MemoryBackend({
 *   maxEntries: 1000,
 *   defaultTtl: 5 * 60 * 1000, // 5 minutes
 *   onEvict: (key, value) => console.log(`Evicted ${key}`)
 * });
 * ```
 */
export class MemoryBackend<T> implements CacheBackend<T> {
  private readonly cache: Map<string, CacheEntry<T>>;
  private readonly options: Required<Omit<MemoryBackendOptions, 'onEvict'>> & {
    onEvict?: MemoryBackendOptions['onEvict'];
  };
  private readonly serializer: Serializer<T>;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private totalMemoryBytes: number = 0;

  /**
   * Create a new MemoryBackend instance.
   * @param options - Configuration options
   */
  constructor(options: MemoryBackendOptions = {}, serializer?: Serializer<T>) {
    this.cache = new Map();
    this.serializer =
      serializer ?? (createJsonSerializer<T>() as Serializer<T>);
    this.options = {
      maxEntries: options.maxEntries ?? 1000,
      maxMemoryBytes: options.maxMemoryBytes ?? Infinity,
      ttlCheckInterval: options.ttlCheckInterval ?? 60_000,
      onEvict: options.onEvict,
    };

    // Start TTL cleanup interval if TTL might be used
    this.cleanupInterval = setInterval(
      () => this.cleanupExpired(),
      this.options.ttlCheckInterval,
    );
  }

  /**
   * Generate a unique key for tracking access order.
   * We use the key directly since Map preserves insertion/access order.
   */
  private getEntry(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Update last accessed timestamp
      entry.lastAccessed = Date.now();
      // Move to end (most recently used) by deleting and re-adding
      this.cache.delete(key);
      this.cache.set(key, entry);
    }
    return entry;
  }

  /**
   * Check if an entry has expired.
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return entry.expiresAt !== undefined && Date.now() > entry.expiresAt;
  }

  /**
   * Clean up expired entries.
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt !== undefined && now > entry.expiresAt) {
        this.cache.delete(key);
        this.totalMemoryBytes -= entry.size;
      }
    }
  }

  /**
   * Evict entries to make room for new ones.
   * Uses LRU policy: removes least recently used entries first.
   */
  private evictIfNeeded(requiredSize: number = 0): void {
    // Check if we need to evict based on entries count
    while (this.cache.size >= this.options.maxEntries && this.cache.size > 0) {
      const result = this.cache.entries().next();
      if (result.done) break;
      const [key, entry] = result.value;
      if (!key) break;
      this.evictEntry(key, entry, 'size');
    }

    // Check if we need to evict based on memory size
    while (
      this.totalMemoryBytes + requiredSize > this.options.maxMemoryBytes &&
      this.cache.size > 0
    ) {
      const result = this.cache.entries().next();
      if (result.done) break;
      const [key, entry] = result.value;
      if (!key) break;
      this.evictEntry(key, entry, 'memory');
    }
  }

  /**
   * Evict a single entry.
   */
  private evictEntry(
    key: string,
    entry: CacheEntry<T>,
    reason: 'size' | 'memory',
  ): void {
    this.cache.delete(key);
    this.totalMemoryBytes -= entry.size;
    this.options.onEvict?.(key, entry.value, reason);
  }

  /**
   * Get a value by key.
   * @param key - The cache key
   * @returns The cached value or null if not found or expired
   */
  async get(key: string): Promise<T | null> {
    const entry = this.getEntry(key);
    if (!entry) return null;

    // Check TTL
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.totalMemoryBytes -= entry.size;
      return null;
    }

    return entry.value;
  }

  /**
   * Get multiple values by keys.
   * @param keys - Array of cache keys
   * @returns Map of key to value (only includes found, non-expired keys)
   */
  async getMany(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        result.set(key, value);
      }
    }
    return result;
  }

  /**
   * Store a value with optional TTL.
   * @param key - The cache key
   * @param value - The value to store
   * @param options - Optional TTL in milliseconds
   */
  async set(key: string, value: T, options?: SetOptions): Promise<void> {
    // Calculate size
    const serialized = this.serializer.serialize(value);
    const size = Buffer.byteLength(serialized, 'utf8');

    // Evict if needed
    this.evictIfNeeded(size);

    // Calculate expiration
    let expiresAt: number | undefined;
    if (options?.ttl !== null && options?.ttl !== undefined) {
      expiresAt = Date.now() + options.ttl;
    }

    // Create entry
    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      lastAccessed: Date.now(),
      size,
    };

    // If key already exists, subtract its size from total
    const existing = this.cache.get(key);
    if (existing) {
      this.totalMemoryBytes -= existing.size;
    }

    // Store
    this.cache.set(key, entry);
    this.totalMemoryBytes += size;
  }

  /**
   * Store multiple key-value pairs with optional TTL.
   * @param entries - Array of [key, value] pairs
   * @param options - Optional TTL in milliseconds
   */
  async setMany(entries: [string, T][], options?: SetOptions): Promise<void> {
    // Calculate total size needed
    let totalNewSize = 0;
    for (const [, value] of entries) {
      try {
        const serialized = this.serializer.serialize(value);
        totalNewSize += Buffer.byteLength(serialized, 'utf8');
      } catch (error) {
        // Skip entries that fail to serialize
        console.warn('Failed to serialize value for setMany:', error);
      }
    }

    // Evict if needed
    this.evictIfNeeded(totalNewSize);

    // Set all entries
    for (const [key, value] of entries) {
      try {
        const serialized = this.serializer.serialize(value);
        const size = Buffer.byteLength(serialized, 'utf8');

        let expiresAt: number | undefined;
        if (options?.ttl !== null && options?.ttl !== undefined) {
          expiresAt = Date.now() + options.ttl;
        }

        const entry: CacheEntry<T> = {
          value,
          expiresAt,
          lastAccessed: Date.now(),
          size,
        };

        const existing = this.cache.get(key);
        if (existing) {
          this.totalMemoryBytes -= existing.size;
        }

        this.cache.set(key, entry);
        this.totalMemoryBytes += size;
      } catch {
        // Skip failed entries
      }
    }
  }

  /**
   * Delete a key.
   * @param key - The cache key
   * @returns true if the key was deleted, false if it didn't exist
   */
  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.totalMemoryBytes -= entry.size;
      return true;
    }
    return false;
  }

  /**
   * Delete multiple keys.
   * @param keys - Array of cache keys
   * @returns Number of keys that were deleted
   */
  async deleteMany(keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (await this.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Check if a key exists (and is not expired).
   * @param key - The cache key
   * @returns true if the key exists
   */
  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.totalMemoryBytes -= entry.size;
      return false;
    }
    return true;
  }

  /**
   * Clear all cache entries.
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.totalMemoryBytes = 0;
  }

  /**
   * Get all keys matching a pattern.
   * Note: Uses simple glob pattern with * and ? wildcards.
   * @param pattern - Glob pattern (default: all keys)
   * @returns Array of matching keys
   */
  async keys(pattern?: string): Promise<string[]> {
    if (!pattern) {
      return Array.from(this.cache.keys());
    }

    // Convert glob to regex
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\*]/g, '\\$&')
      .replace(/\\\*/g, '.*')
      .replace(/\\\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);

    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }

  /**
   * Get the TTL for a key in milliseconds.
   * @param key - The cache key
   * @returns TTL in ms, -1 for persistent (no expiry), -2 if key doesn't exist
   */
  async getTtl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -2;
    if (entry.expiresAt === undefined) return -1;

    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : -2;
  }

  /**
   * Extend the TTL of an existing key.
   * @param key - The cache key
   * @param ttl - New TTL in milliseconds from now
   * @returns true if TTL was extended, false if key doesn't exist
   */
  async extendTtl(key: string, ttl: number): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expiresAt = Date.now() + ttl;
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return true;
  }

  /**
   * Get current statistics about the cache.
   */
  getStats(): {
    size: number;
    totalMemoryBytes: number;
    maxEntries: number;
    maxMemoryBytes: number;
  } {
    return {
      size: this.cache.size,
      totalMemoryBytes: this.totalMemoryBytes,
      maxEntries: this.options.maxEntries,
      maxMemoryBytes: this.options.maxMemoryBytes,
    };
  }

  /**
   * Close the backend and release resources.
   */
  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    await this.clear();
  }
}

/**
 * Create a new MemoryBackend instance.
 * @param options - Configuration options
 * @returns A new MemoryBackend instance
 */
export function createMemoryBackend<T>(
  options: MemoryBackendOptions = {},
  serializer?: Serializer<T>,
): MemoryBackend<T> {
  return new MemoryBackend<T>(options, serializer);
}
