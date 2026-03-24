import type { LogLevel, LogEntry } from '@feizk/logger';

export type DiscordLogEntry = LogEntry;

export type { QueuePriority } from './persistent-queue';

/**
 * Discord embed field for rich messages.
 */
export interface DiscordEmbedField {
  /** Name of the field */
  name: string;
  /** Value of the field */
  value: string;
  /** Whether the field should be inline */
  inline?: boolean;
}

/**
 * Discord embed configuration.
 */
export interface DiscordEmbed {
  /** Title of the embed */
  title?: string;
  /** Description of the embed */
  description?: string;
  /** URL of the embed */
  url?: string;
  /** Timestamp of the embed */
  timestamp?: string;
  /** Color of the embed (decimal value) */
  color?: number;
  /** Author of the embed */
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  /** Thumbnail of the embed */
  thumbnail?: {
    url: string;
  };
  /** Footer of the embed */
  footer?: {
    text: string;
    icon_url?: string;
  };
  /** Fields of the embed */
  fields?: DiscordEmbedField[];
}

/**
 * Discord webhook message payload.
 */
export interface DiscordWebhookPayload {
  /** Username to display in Discord */
  username?: string;
  /** Avatar URL */
  avatar_url?: string;
  /** Content message (simple text) */
  content?: string;
  /** Array of embeds */
  embeds?: DiscordEmbed[];
}

/**
 * Options for configuring batching behavior.
 */
export interface BatchingOptions {
  /** Enable log batching (default: true) */
  enabled?: boolean;
  /** Debounce delay in ms for non-critical logs (default: 1000) */
  debounceMs?: number;
  /** Maximum batch size, Discord allows 10 embeds per message (default: 10) */
  maxBatchSize?: number;
  /** Log levels that trigger immediate flush (default: ['error', 'fatal']) */
  immediateFlushLevels?: LogLevel[];
}

/**
 * Options for configuring message compression behavior.
 */
export interface CompressionOptions {
  /** Enable compression for large contexts (default: true) */
  enabled?: boolean;
  /** Size threshold in characters for compression (default: 1024) */
  threshold?: number;
}

/**
 * Options for configuring the Discord transport.
 */
export interface DiscordTransportOptions {
  /** Discord webhook URL */
  webhookURL: string;
  /** Username to display in Discord (default: 'Logger') */
  username?: string;
  /** Avatar URL for the webhook */
  avatarURL?: string;
  /** Default log level to send to Discord (default: 'info') */
  defaultLevel?: LogLevel;
  /** Minimum log level to send to Discord (default: 'info') */
  level?: LogLevel;
  /** Custom formatter function */
  formatter?: (entry: DiscordLogEntry) => string;
  /** Map log levels to Discord embed colors */
  levelColors?: Record<LogLevel, number>;
  /** Whether to include context in embeds (default: true) */
  includeContext?: boolean;
  /** Whether to send as webhook payload directly (advanced) */
  customPayload?: (entry: DiscordLogEntry) => DiscordWebhookPayload;
  /** Batching configuration options */
  batching?: BatchingOptions;
  /** Compression configuration options */
  compression?: CompressionOptions;
  /** Circuit breaker configuration options */
  circuitBreaker?: CircuitBreakerOptions;
  /** Persistent queue configuration options */
  persistentQueue?: PersistentQueueOptions;
}

/**
 * Options for configuring the circuit breaker.
 */
export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms before attempting to close circuit (default: 30000) */
  resetTimeoutMs?: number;
  /** Number of successes required to fully close circuit (default: 1) */
  successThreshold?: number;
}

/**
 * Options for configuring the persistent queue.
 */
export interface PersistentQueueOptions {
  /** Storage type: 'memory' or 'file' */
  storage: 'memory' | 'file';
  /** File path for file-based storage (default: '.vel/discord-queue.json') */
  filePath?: string;
  /** Maximum queue size (default: 10000) */
  maxSize?: number;
  /** Maximum retries for failed messages (default: 5) */
  maxRetries?: number;
  /** Flush interval in ms for file storage (default: 5000) */
  flushIntervalMs?: number;
}

/**
 * Default Discord embed colors for each log level (decimal values).
 */
export const DEFAULT_LEVEL_COLORS: Record<LogLevel, number> = {
  trace: 0x95a5a6, // Gray
  debug: 0x3498db, // Blue
  info: 0x2ecc71, // Green
  warn: 0xf1c40f, // Yellow
  error: 0xe74c3c, // Red
  fatal: 0x8e44ad, // Purple
};

/**
 * Minimum log levels that should trigger Discord notifications by default.
 */
export const DEFAULT_MIN_LEVEL: LogLevel = 'info';

/**
 * Default batching options.
 */
export const DEFAULT_BATCHING_OPTIONS: Required<BatchingOptions> = {
  enabled: true,
  debounceMs: 1000,
  maxBatchSize: 10,
  immediateFlushLevels: ['error', 'fatal'],
};

/**
 * Default compression options.
 */
export const DEFAULT_COMPRESSION_OPTIONS: Required<CompressionOptions> = {
  enabled: true,
  threshold: 1024,
};

/**
 * Default circuit breaker options.
 */
export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: Required<CircuitBreakerOptions> =
  {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    successThreshold: 1,
  };

/**
 * Default persistent queue options.
 */
export const DEFAULT_PERSISTENT_QUEUE_OPTIONS: Required<PersistentQueueOptions> =
  {
    storage: 'memory',
    filePath: '.vel/discord-queue.json',
    maxSize: 10000,
    maxRetries: 5,
    flushIntervalMs: 5000,
  };
