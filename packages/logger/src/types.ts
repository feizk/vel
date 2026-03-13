/**
 * Log levels ordered by severity.
 * - trace: Very detailed debugging information
 * - debug: Detailed information for debugging
 * - info: General informational messages
 * - warn: Warning conditions
 * - error: Error conditions
 * - fatal: Critical errors that may terminate the application
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * A structured log entry passed to transports and formatters.
 */
export interface LogEntry {
  /** Unique identifier for this log entry */
  id?: string;
  /** IDs of related log entries */
  references?: string[];
  /** The log level of this entry */
  level: LogLevel;
  /** ISO 8601 formatted timestamp */
  timestamp: string;
  /** Original arguments passed to the log method */
  args: unknown[];
  /** Optional prefix from the logger hierarchy */
  prefix?: string;
  /** Context metadata attached to the logger */
  context: Record<string, unknown>;
}

/**
 * Optional metadata attached to a log entry.
 */
export interface LogMeta {
  /** Custom identifier for this entry (overrides generated ID when provided) */
  id?: string;
  /** Related log entry IDs */
  references?: string[];
}

/**
 * Options for automatic log entry IDs and in-memory search index.
 */
export interface EntryIdOptions {
  /** Enable automatic entry IDs (default: false) */
  enabled?: boolean;
  /** Custom ID generator */
  generator?: () => string;
  /** Store entries in-memory for lookup by ID (default: false) */
  store?: boolean;
  /** Maximum number of indexed entries retained (default: 1000) */
  maxStoredEntries?: number;
}

/**
 * Pluggable transport interface.
 * Implement this interface to create custom log transports.
 */
export interface Transport {
  /**
   * Called for each log entry.
   * @param entry - The structured log entry
   */
  log(entry: LogEntry): void | Promise<void>;

  /**
   * Optional cleanup method called when the logger is destroyed.
   */
  destroy?(): void | Promise<void>;
}

/**
 * Timestamp option: preset string or custom formatter function.
 * - 'iso': ISO 8601 format (default)
 * - 'locale': Localized date/time string
 * - function: Custom formatter
 */
export type TimestampOption = 'iso' | 'locale' | ((date: Date) => string);

/**
 * Custom formatter function for log output.
 * @param entry - The structured log entry
 * @returns The formatted string to output to console
 */
export type Formatter = (entry: LogEntry) => string;

/**
 * Options for creating a child logger.
 */
export interface ChildLoggerOptions {
  /** Prefix to prepend to log messages */
  prefix?: string;
  /** Additional context metadata */
  context?: Record<string, unknown>;
  /** Override log level for this child logger */
  level?: LogLevel;
  /** Override silent mode for this child logger */
  silent?: boolean;
}

/**
 * Main logger configuration options.
 */
export interface LoggerOptions {
  /** Minimum log level to output (default: 'debug') */
  level?: LogLevel;
  /** Suppress all console output (default: false) */
  silent?: boolean;
  /** Enable colored output (default: true) */
  enableColors?: boolean;
  /** Timestamp format (default: 'iso') */
  timestamp?: TimestampOption;
  /** Custom formatter for log output */
  formatter?: Formatter;
  /** Output logs as JSON (default: false) */
  json?: boolean;
  /** Initial transports to attach */
  transports?: Transport[];
  /** Prefix for all log messages */
  prefix?: string;
  /** Initial context metadata */
  context?: Record<string, unknown>;
  /** Optional ID generation and lookup settings */
  entryIds?: EntryIdOptions;
}
