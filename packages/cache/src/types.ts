/**
 * Core types and interfaces for the cache library.
 * @module types
 */

import type { Redis } from 'ioredis';

/**
 * Options for setting a cache entry.
 */
export interface SetOptions {
  /**
   * Time-to-live in milliseconds.
   * - `undefined`: use default TTL from cache options
   * - `null`: no expiration (persistent)
   * - `number`: specific TTL in milliseconds
   */
  ttl?: number | null;
}

/**
 * Options for the getOrFetch method.
 */
export interface FetchOptions extends SetOptions {
  /**
   * If true, the cache will be updated in the background with the fetched value
   * while returning the stale value immediately if it exists.
   */
  staleWhileRevalidate?: boolean;
}

/**
 * Metrics for cache operations.
 */
export interface CacheMetrics {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Total number of get operations */
  gets: number;
  /** Total number of set operations */
  sets: number;
  /** Total number of delete operations */
  deletes: number;
  /** Total number of clear operations */
  clears: number;
  /** Average get duration in milliseconds */
  avgGetDuration: number;
  /** Average set duration in milliseconds */
  avgSetDuration: number;
  /** Total get duration sum for calculating average */
  totalGetDuration: number;
  /** Total set duration sum for calculating average */
  totalSetDuration: number;
  /** Backend-specific metrics */
  backend: Record<string, unknown>;
}

/**
 * Options for creating a Cache instance.
 */
export interface CacheOptions<T> {
  /**
   * The backend storage implementation.
   */
  backend: CacheBackend<T>;
  /**
   * Optional namespace prefix for all keys.
   * Useful for multi-tenant or multi-environment setups.
   */
  namespace?: string;
  /**
   * Default TTL in milliseconds applied to all set operations
   * when not explicitly provided.
   */
  defaultTtl?: number;
  /**
   * Custom serializer function for converting values to storage format.
   * If not provided, JSON serialization is used.
   */
  serialize?: (value: T) => Buffer | string;
  /**
   * Custom deserializer function for converting storage format back to values.
   * If not provided, JSON deserialization is used.
   */
  deserialize?: (data: Buffer | string) => T;
  /**
   * Enable metrics collection. Default: false.
   */
  enableMetrics?: boolean;
}

/**
 * Backend-specific memory options.
 */
export interface MemoryBackendOptions {
  /**
   * Maximum number of entries to store. Default: 1000.
   */
  maxEntries?: number;
  /**
   * Maximum memory usage in bytes (approximate). Optional.
   * If set, eviction will occur when total size exceeds this limit.
   */
  maxMemoryBytes?: number;
  /**
   * Callback invoked when an entry is evicted due to LRU policy.
   */
  onEvict?: (key: string, value: unknown, reason: 'size' | 'memory') => void;
  /**
   * TTL check interval in milliseconds. Default: 60000 (1 minute).
   * Only used if TTL support is enabled.
   */
  ttlCheckInterval?: number;
}

/**
 * Backend-specific Redis options.
 */
export interface RedisBackendOptions {
  /**
   * Redis connection URL (e.g., redis://localhost:6379).
   * Alternatively, provide an existing Redis client instance.
   */
  url?: string;
  /**
   * Existing Redis client instance. If provided, `url` is ignored.
   * Must be an instance of ioredis.Redis or compatible.
   */
  client?: Redis;
  /**
   * Key prefix for all Redis keys. Useful for namespacing.
   */
  keyPrefix?: string;
  /**
   * Connection retry configuration.
   */
  retryStrategy?: (times: number) => number;
}

/**
 * Error class for cache-specific errors.
 */
export class CacheError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CacheError';
  }
}

/**
 * Backend interface that all cache backends must implement.
 * @template T - The type of values stored in the cache.
 */
export interface CacheBackend<T> {
  /**
   * Retrieve a value by key.
   * @param key - The cache key
   * @returns The cached value or null if not found
   */
  get(key: string): Promise<T | null>;

  /**
   * Retrieve multiple values by keys.
   * @param keys - Array of cache keys
   * @returns Map of key to value (only includes found keys)
   */
  getMany(keys: string[]): Promise<Map<string, T>>;

  /**
   * Store a value with optional TTL.
   * @param key - The cache key
   * @param value - The value to store
   * @param options - Optional set options (ttl)
   */
  set(key: string, value: T, options?: SetOptions): Promise<void>;

  /**
   * Store multiple key-value pairs with optional TTL.
   * @param entries - Array of [key, value] pairs
   * @param options - Optional set options (ttl)
   */
  setMany(entries: [string, T][], options?: SetOptions): Promise<void>;

  /**
   * Delete a key.
   * @param key - The cache key
   * @returns true if the key was deleted, false if it didn't exist
   */
  delete(key: string): Promise<boolean>;

  /**
   * Delete multiple keys.
   * @param keys - Array of cache keys
   * @returns Number of keys that were deleted
   */
  deleteMany(keys: string[]): Promise<number>;

  /**
   * Check if a key exists.
   * @param key - The cache key
   * @returns true if the key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Clear all cache entries.
   */
  clear(): Promise<void>;

  /**
   * Get all keys matching a pattern.
   * @param pattern - Glob-style pattern (default: all keys)
   * @returns Array of matching keys
   */
  keys(pattern?: string): Promise<string[]>;

  /**
   * Get the TTL for a key in milliseconds.
   * @param key - The cache key
   * @returns TTL in ms, -1 for persistent (no expiry), -2 if key doesn't exist
   */
  getTtl(key: string): Promise<number>;

  /**
   * Extend the TTL of an existing key.
   * @param key - The cache key
   * @param ttl - New TTL in milliseconds
   * @returns true if TTL was extended, false if key doesn't exist
   */
  extendTtl?(key: string, ttl: number): Promise<boolean>;

  /**
   * Close the backend and release resources.
   * Optional but recommended for backends with connections.
   */
  disconnect?(): Promise<void>;
}

/**
 * Internal entry representation with metadata.
 */
export interface CacheEntry<T> {
  /** The cached value */
  value: T;
  /** Expiration time in milliseconds (Unix timestamp) */
  expiresAt?: number;
  /** Last access timestamp */
  lastAccessed: number;
  /** Size in bytes (approximate) */
  size: number;
}

/**
 * LRU node for memory backend.
 */
export interface LRUNode<T> {
  key: string;
  value: T;
  expiresAt?: number;
  size: number;
  prev: LRUNode<T> | null;
  next: LRUNode<T> | null;
}
