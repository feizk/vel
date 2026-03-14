/**
 * Main Cache class providing a type-safe interface to cache backends.
 * @module cache
 */

import { Logger } from '@feizk/logger';
import { Kit } from '@feizk/kit';
import type {
  CacheBackend,
  CacheOptions,
  CacheMetrics,
  SetOptions,
  FetchOptions,
  CacheLogger,
  MemoryLayerOptions,
} from './types';
import { CacheError } from './types';
import type { Serializer } from './serializers/interface';
import { createJsonSerializer } from './serializers/json';

interface MemoryRecord<T> {
  value: T;
  expiresAt?: number;
}

export class Cache<T> {
  private readonly backend: CacheBackend<T>;
  private readonly namespace: string;
  private readonly defaultTtl: number | undefined;
  private readonly serializer: Serializer<T>;
  private readonly customDeserializer?: (data: Buffer | string) => T;
  private readonly enableMetrics: boolean;
  private readonly debug: boolean;
  private readonly logger: CacheLogger;
  private readonly memory?: Kit<string, T>;

  private hits: number = 0;
  private misses: number = 0;
  private gets: number = 0;
  private sets: number = 0;
  private deletes: number = 0;
  private clears: number = 0;
  private totalGetDuration: number = 0;
  private totalSetDuration: number = 0;

  constructor(options: CacheOptions<T>) {
    this.backend = options.backend;
    this.namespace = options.namespace ?? '';
    this.defaultTtl = options.defaultTtl;
    this.enableMetrics = options.enableMetrics ?? false;
    this.debug = options.debug ?? false;
    this.logger = options.logger ?? new Logger({
      level: 'debug',
      prefix: 'cache',
    });

    this.memory = this.resolveMemoryLayer(options.memory);

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

  private resolveMemoryLayer(
    memory: boolean | MemoryLayerOptions | undefined,
  ): Kit<string, T> | undefined {
    if (!memory) return undefined;

    if (typeof memory === 'object' && memory.enabled === false) {
      return undefined;
    }

    return new Kit<string, T>();
  }

  private logDebug(message: string, details?: Record<string, unknown>): void {
    if (!this.debug) return;
    if (details) {
      this.logger.debug(`[cache] ${message}`, details);
      return;
    }
    this.logger.debug(`[cache] ${message}`);
  }

  private buildKey(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }

  private recordGet(hit: boolean, duration: number): void {
    if (!this.enableMetrics) return;
    this.gets++;
    if (hit) this.hits++;
    else this.misses++;
    this.totalGetDuration += duration;
  }

  private recordSet(duration: number): void {
    if (!this.enableMetrics) return;
    this.sets++;
    this.totalSetDuration += duration;
  }

  private recordDelete(): void {
    if (!this.enableMetrics) return;
    this.deletes++;
  }

  private recordClear(): void {
    if (!this.enableMetrics) return;
    this.clears++;
  }

  private async setMemoryEntry(
    fullKey: string,
    value: T,
    ttl?: number | null,
  ): Promise<void> {
    if (!this.memory) return;

    if (ttl === null) {
      this.memory.set(fullKey, value);
    } else if (ttl !== undefined && ttl > 0) {
      this.memory.setWithTtl(fullKey, value, ttl);
    } else {
      this.memory.set(fullKey, value);
    }

    this.logDebug(`memory:set ${fullKey}`, {
      key: fullKey,
      ttl: ttl ?? 'persistent',
      memorySize: this.memory.size,
    });
  }

  private deleteMemoryEntry(fullKey: string): void {
    if (!this.memory) return;
    this.memory.delete(fullKey);
    this.logDebug(`memory:delete ${fullKey}`, {
      key: fullKey,
      memorySize: this.memory.size,
    });
  }

  private async syncMemoryFromBackend(fullKey: string, value: T): Promise<void> {
    if (!this.memory) return;

    const ttlMs = await this.backend.getTtl(fullKey);
    if (ttlMs === -2) {
      this.deleteMemoryEntry(fullKey);
      return;
    }

    if (ttlMs === -1) {
      this.memory.set(fullKey, value);
    } else if (ttlMs > 0) {
      this.memory.setWithTtl(fullKey, value, ttlMs);
    }

    this.logDebug(`memory:set ${fullKey}`, {
      key: fullKey,
      synchronizedFrom: 'redis',
      ttl: ttlMs,
      memorySize: this.memory.size,
    });
  }

  async get(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const start = this.enableMetrics ? process.hrtime.bigint() : undefined;

    try {
      if (this.memory) {
        const memoryRecord = this.memory.getRecord(fullKey) as
          | MemoryRecord<T>
          | undefined;

        if (memoryRecord) {
          this.logDebug(`memory:get ${fullKey} (hit)`, {
            key: fullKey,
            expiresAt: memoryRecord.expiresAt ?? null,
          });
          if (this.enableMetrics && start !== undefined) {
            const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
            this.recordGet(true, duration);
          }
          return memoryRecord.value;
        }

        this.logDebug(`memory:get ${fullKey} (miss)`, { key: fullKey });
      }

      const value = await this.backend.get(fullKey);
      this.logDebug(`redis:get ${fullKey} (${value === null ? 'miss' : 'hit'})`, {
        key: fullKey,
        outcome: value === null ? 'miss' : 'hit',
      });

      if (value !== null && this.memory) {
        await this.syncMemoryFromBackend(fullKey, value);
      }

      if (this.enableMetrics && start !== undefined) {
        const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
        this.recordGet(value !== null, duration);
      }

      return value;
    } catch (error) {
      if (this.enableMetrics && start !== undefined) {
        const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
        this.recordGet(false, duration);
      }
      throw this.wrapError(error, `get(${key})`);
    }
  }

  async set(key: string, value: T, ttl?: number | null): Promise<void> {
    const fullKey = this.buildKey(key);
    const start = this.enableMetrics ? process.hrtime.bigint() : undefined;

    try {
      const resolvedTtl = ttl === undefined ? this.defaultTtl : ttl;
      const options: SetOptions = { ttl: resolvedTtl };

      await this.backend.set(fullKey, value, options);
      this.logDebug(`redis:set ${fullKey}`, { key: fullKey, ttl: resolvedTtl ?? null });

      await this.setMemoryEntry(fullKey, value, resolvedTtl);

      if (this.enableMetrics && start !== undefined) {
        const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
        this.recordSet(duration);
      }
    } catch (error) {
      if (this.enableMetrics && start !== undefined) {
        const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
        this.recordSet(duration);
      }
      throw this.wrapError(error, `set(${key})`);
    }
  }

  async update(key: string, value: T, ttl?: number | null): Promise<void> {
    await this.set(key, value, ttl);
  }

  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    try {
      const result = await this.backend.delete(fullKey);
      this.logDebug(`redis:delete ${fullKey}`, { key: fullKey, deleted: result });
      this.deleteMemoryEntry(fullKey);
      if (result) this.recordDelete();
      return result;
    } catch (error) {
      throw this.wrapError(error, `delete(${key})`);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.backend.clear();
      this.logDebug('redis:clear *', { namespace: this.namespace || 'global' });
      this.memory?.clear();
      this.recordClear();
    } catch (error) {
      throw this.wrapError(error, 'clear()');
    }
  }

  async getMany(keys: string[]): Promise<(T | null)[]> {
    const result: (T | null)[] = [];
    for (const key of keys) {
      result.push(await this.get(key));
    }
    return result;
  }

  async setMany(entries: [string, T][], ttl?: number | null): Promise<void> {
    const fullEntries = entries.map(
      ([key, value]) => [this.buildKey(key), value] as [string, T],
    );
    const start = this.enableMetrics ? process.hrtime.bigint() : undefined;

    try {
      const resolvedTtl = ttl === undefined ? this.defaultTtl : ttl;
      const options: SetOptions = { ttl: resolvedTtl };
      await this.backend.setMany(fullEntries, options);

      this.logDebug('redis:setMany', {
        totalEntries: entries.length,
        keys: fullEntries.map(([key]) => key),
        ttl: resolvedTtl ?? null,
      });

      if (this.memory) {
        for (const [fullKey, value] of fullEntries) {
          await this.setMemoryEntry(fullKey, value, resolvedTtl);
        }
      }

      if (this.enableMetrics && start !== undefined) {
        const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
        this.sets += entries.length;
        this.totalSetDuration += duration;
      }
    } catch (error) {
      if (this.enableMetrics && start !== undefined) {
        const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
        this.totalSetDuration += duration;
      }
      throw this.wrapError(error, `setMany(${entries.length} entries)`);
    }
  }

  async deleteMany(keys: string[]): Promise<number> {
    const fullKeys = keys.map((k) => this.buildKey(k));
    try {
      const result = await this.backend.deleteMany(fullKeys);
      this.logDebug('redis:deleteMany', { totalKeys: keys.length, keys: fullKeys });
      if (this.memory) {
        for (const key of fullKeys) {
          this.deleteMemoryEntry(key);
        }
      }
      if (result > 0) this.recordDelete();
      return result;
    } catch (error) {
      throw this.wrapError(error, `deleteMany(${keys.length} keys)`);
    }
  }

  async has(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    try {
      if (this.memory?.has(fullKey)) {
        this.logDebug(`memory:has ${fullKey} (hit)`, { key: fullKey });
        return true;
      }
      return await this.backend.exists(fullKey);
    } catch (error) {
      throw this.wrapError(error, `has(${key})`);
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    const fullPattern = pattern ? this.buildKey(pattern) : undefined;
    try {
      const keys = await this.backend.keys(fullPattern);
      const prefixLength = this.namespace ? this.namespace.length + 1 : 0;
      return keys.map((key) => key.substring(prefixLength));
    } catch (error) {
      throw this.wrapError(error, `keys(${pattern})`);
    }
  }

  async getTtl(key: string): Promise<number> {
    const fullKey = this.buildKey(key);
    try {
      return await this.backend.getTtl(fullKey);
    } catch (error) {
      throw this.wrapError(error, `getTtl(${key})`);
    }
  }

  async extendTtl(key: string, ttl: number): Promise<boolean> {
    const fullKey = this.buildKey(key);
    try {
      const updated = (await this.backend.extendTtl?.(fullKey, ttl)) ?? false;
      if (updated && this.memory) {
        const record = this.memory.getRecord(fullKey) as MemoryRecord<T> | undefined;
        if (record) {
          this.memory.setWithTtl(fullKey, record.value, ttl);
          this.logDebug(`memory:set ${fullKey}`, {
            key: fullKey,
            operation: 'extendTtl',
            ttl,
          });
        }
      }
      return updated;
    } catch (error) {
      throw this.wrapError(error, `extendTtl(${key})`);
    }
  }

  async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    options: FetchOptions = {},
  ): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) {
      if (options.staleWhileRevalidate) {
        this.getOrFetch(key, fetcher, { ttl: options.ttl }).catch(() => {
          // Ignore background fetch errors
        });
      }
      return cached;
    }

    const value = await fetcher();
    const ttl = options.ttl ?? this.defaultTtl;
    if (ttl !== null && ttl !== undefined) {
      await this.set(key, value, ttl);
    } else {
      await this.set(key, value);
    }

    return value;
  }

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

  getBackend(): CacheBackend<T> {
    return this.backend;
  }

  getNamespace(): string {
    return this.namespace;
  }

  isMetricsEnabled(): boolean {
    return this.enableMetrics;
  }
}

import { MemoryBackend } from './backends/memory';
import { RedisBackend } from './backends/redis';
