/**
 * Serializer interface for converting values to/from storage format.
 * @module serializers/interface
 */

// import type { CacheError } from '../types'; // Used in deserialize error handling

/**
 * Serializer interface for converting cache values to and from storage format.
 */
export interface Serializer<T> {
  /**
   * Serialize a value to storage format (Buffer or string).
   * @param value - The value to serialize
   * @returns Serialized representation
   */
  serialize(value: T): Buffer | string;

  /**
   * Deserialize storage format back to original value type.
   * @param data - The serialized data
   * @returns The deserialized value
   * @throws {CacheError} If deserialization fails
   */
  deserialize(data: Buffer | string): T;

  /**
   * Get the estimated size of a serialized value in bytes.
   * Used for memory-based eviction strategies.
   * @param value - The value to estimate size for
   * @returns Estimated size in bytes
   */
  getSize?(value: T): number;
}
