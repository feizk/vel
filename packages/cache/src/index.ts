/**
 * @feizk/cache - Type-safe, multi-backend caching library
 * @module @feizk/cache
 */

// Main cache class
export { Cache } from './cache';

// Backends
export { MemoryBackend, createMemoryBackend } from './backends/memory';
export { RedisBackend, createRedisBackend } from './backends/redis';

// Serializers
export { Serializer } from './serializers/interface';
export { JsonSerializer, createJsonSerializer } from './serializers/json';

// Types
export type {
  CacheBackend,
  CacheOptions,
  CacheEntry,
  CacheError,
  CacheMetrics,
  FetchOptions,
  LRUNode,
  MemoryBackendOptions,
  RedisBackendOptions,
  SetOptions,
} from './types';

// Utility functions
// export * from './utils';
