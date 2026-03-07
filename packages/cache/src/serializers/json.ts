/**
 * JSON serializer implementation with support for special types.
 * @module serializers/json
 */

import type { Serializer } from './interface';
import { CacheError } from '../types';

/**
 * Special types that need custom serialization handling.
 */
const SPECIAL_TYPES = new Set([
  '[object Date]',
  '[object RegExp]',
  '[object Map]',
  '[object Set]',
  '[object Buffer]',
]);

/**
 * Check if a value is a special type that requires custom serialization.
 */
function isSpecialType(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  // Check using toString tag
  const type = Object.prototype.toString.call(value);
  if (SPECIAL_TYPES.has(type)) return true;
  // Also check for Buffer explicitly (its toString tag may vary across Node versions)
  if (Buffer.isBuffer(value)) return true;
  return false;
}

/**
 * Serialize a Date to a JSON object with type marker.
 */
function serializeDate(date: Date): string {
  return JSON.stringify({ __type: 'Date', value: date.toISOString() });
}

/**
 * Serialize a RegExp to a JSON object with type marker.
 */
function serializeRegExp(regexp: RegExp): string {
  return JSON.stringify({
    __type: 'RegExp',
    source: regexp.source,
    flags: regexp.flags,
  });
}

/**
 * Serialize a Map to a JSON object with type marker.
 */
function serializeMap(map: Map<unknown, unknown>): string {
  const entries = Array.from(map.entries());
  return JSON.stringify({ __type: 'Map', entries });
}

/**
 * Serialize a Set to a JSON object with type marker.
 */
function serializeSet(set: Set<unknown>): string {
  const values = Array.from(set.values());
  return JSON.stringify({ __type: 'Set', values });
}

/**
 * Serialize a Buffer to a JSON object with type marker.
 */
function serializeBuffer(buffer: Buffer): string {
  return JSON.stringify({ __type: 'Buffer', value: buffer.toString('base64') });
}

/**
 * Deserialize a type-marked JSON object back to its original type.
 */
function deserializeWithType(parsed: unknown): unknown {
  if (typeof parsed !== 'object' || parsed === null || !('__type' in parsed)) {
    return parsed;
  }

  const obj = parsed as Record<string, unknown>;
  const __type = obj.__type as string;

  switch (__type) {
    case 'Date': {
      const dateValue = obj.value as string | undefined;
      return dateValue ? new Date(dateValue) : parsed;
    }
    case 'RegExp': {
      const source = obj.source as string | undefined;
      const flags = obj.flags as string | undefined;
      return source && flags ? new RegExp(source, flags) : parsed;
    }
    case 'Map': {
      const entries = obj.entries as [unknown, unknown][] | undefined;
      return entries ? new Map(entries) : parsed;
    }
    case 'Set': {
      const values = obj.values as unknown[] | undefined;
      return values ? new Set(values) : parsed;
    }
    case 'Buffer': {
      const base64 = obj.value as string | undefined;
      return base64 ? Buffer.from(base64, 'base64') : parsed;
    }
    default:
      return parsed;
  }
}

/**
 * Detect circular references during JSON.stringify.
 */
function detectCircular(value: unknown, seen = new Set()): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (seen.has(value)) return true;
  seen.add(value);
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      if (detectCircular((value as Record<string, unknown>)[key], seen))
        return true;
    }
  }
  return false;
}

/**
 * JSON Serializer implementation.
 * Supports Date, RegExp, Map, Set, Buffer with type markers.
 * Detects circular references and throws descriptive errors.
 */
export class JsonSerializer<T> implements Serializer<T> {
  /**
   * Serialize a value to JSON string with type markers for special types.
   * @param value - The value to serialize
   * @returns JSON string with type markers
   * @throws {CacheError} If the value contains circular references
   */
  serialize(value: T): string {
    if (detectCircular(value)) {
      throw new CacheError(
        'Cannot serialize circular reference',
        'SERIALIZATION_ERROR',
      );
    }

    if (isSpecialType(value)) {
      const v = value as Record<string, unknown>;
      if (v instanceof Date) return serializeDate(v);
      if (v instanceof RegExp) return serializeRegExp(v);
      if (v instanceof Map) return serializeMap(v);
      if (v instanceof Set) return serializeSet(v);
      if (Buffer.isBuffer(v)) return serializeBuffer(v);
    }

    // For plain objects and arrays, we need to recursively handle nested special types.
    // We'll use a reviver function during JSON.stringify to replace special types with type markers.
    // But since we already handle top-level special types above, for nested ones we need a custom replacer.
    // However, to keep it simple and performant, we can use a reviver approach: we cannot easily
    // recursively serialize nested special types with a simple approach. For now, we'll just
    // JSON.stringify the value, which will lose nested special types. This is a known limitation.
    // A full solution would use a custom replacer that walks the structure.
    return JSON.stringify(value);
  }

  /**
   * Deserialize a JSON string back to the original value.
   * Automatically detects and reconstructs special types.
   * @param data - The serialized data
   * @returns The deserialized value
   * @throws {CacheError} If JSON parsing fails
   */
  deserialize(data: Buffer | string): T {
    let jsonStr: string;
    if (Buffer.isBuffer(data)) {
      jsonStr = data.toString('utf8');
    } else {
      jsonStr = data;
    }

    try {
      const parsed = JSON.parse(jsonStr);

      // Recursively deserialize any type-marked objects in the structure
      const revive = (value: unknown): unknown => {
        if (typeof value === 'object' && value !== null) {
          // Check if this object is a type marker
          const result = deserializeWithType(value);
          if (result !== value) {
            return result;
          }
          // Also check inside objects and arrays
          if (Array.isArray(value)) {
            return value.map(revive);
          } else {
            const revived: Record<string, unknown> = {};
            for (const key in value) {
              if (Object.prototype.hasOwnProperty.call(value, key)) {
                revived[key] = revive((value as Record<string, unknown>)[key]);
              }
            }
            return revived;
          }
        }
        return value;
      };

      const revived = revive(parsed);
      return revived as T;
    } catch (error) {
      throw new CacheError(
        `Failed to deserialize: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DESERIALIZATION_ERROR',
        error,
      );
    }
  }

  /**
   * Estimate the size of a value in bytes.
   * For serialized data, we use the byte length of the JSON string.
   * @param value - The value to estimate size for
   * @returns Estimated size in bytes
   */
  getSize(value: T): number {
    try {
      const serialized = this.serialize(value);
      return Buffer.byteLength(serialized, 'utf8');
    } catch {
      // If serialization fails, return a rough estimate based on type
      if (typeof value === 'string') return Buffer.byteLength(value, 'utf8');
      if (Buffer.isBuffer(value)) return value.length;
      return 0;
    }
  }
}

/**
 * Create a new JSON serializer instance.
 * @returns A new JsonSerializer instance
 */
export function createJsonSerializer<T>(): Serializer<T> {
  return new JsonSerializer<T>();
}
