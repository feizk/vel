import { LOG_LEVEL_PRIORITIES, CONSOLE_METHODS } from './constants';
import {
  getColoredLabel,
  formatTimestamp,
  formatJson,
  buildMessage,
} from './utils';
import type {
  LoggerOptions,
  LogLevel,
  LogEntry,
  Transport,
  ChildLoggerOptions,
} from './types';

/**
 * Internal options type with required fields
 */
interface InternalLoggerOptions {
  level: LogLevel;
  silent: boolean;
  enableColors: boolean;
  timestamp: 'iso' | 'locale' | ((date: Date) => string);
  formatter: ((entry: LogEntry) => string) | undefined;
  json: boolean;
  transports: Transport[];
  prefix: string | undefined;
  context: Record<string, unknown>;
}

/**
 * A lightweight, pluggable logger with colored outputs, structured logging, and transport support.
 *
 * @example
 * ```typescript
 * import { Logger } from '@feizk/logger';
 *
 * const logger = new Logger();
 *
 * logger.info('Hello, world!');
 * logger.warn('This is a warning');
 * logger.error('This is an error');
 * ```
 */
export class Logger {
  private readonly options: InternalLoggerOptions;
  private readonly transports: Transport[];
  private readonly prefix?: string;
  private readonly context: Readonly<Record<string, unknown>>;

  /**
   * Create a new Logger instance.
   * @param options - Configuration options
   */
  constructor(options: LoggerOptions = {}) {
    this.options = {
      level: options.level ?? 'debug',
      silent: options.silent ?? false,
      enableColors: options.enableColors ?? true,
      timestamp: options.timestamp ?? 'iso',
      formatter: options.formatter,
      json: options.json ?? false,
      transports: [...(options.transports ?? [])],
      prefix: options.prefix,
      context: { ...(options.context ?? {}) },
    };
    this.transports = this.options.transports;
    this.prefix = this.options.prefix;
    this.context = this.options.context as Readonly<Record<string, unknown>>;
  }

  // ============================================================================
  // Public Log Methods
  // ============================================================================

  /**
   * Log a trace message (most verbose).
   * @param args - Arguments to log
   */
  trace(...args: unknown[]): void {
    this.log('trace', args);
  }

  /**
   * Log a debug message.
   * @param args - Arguments to log
   */
  debug(...args: unknown[]): void {
    this.log('debug', args);
  }

  /**
   * Log an info message.
   * @param args - Arguments to log
   */
  info(...args: unknown[]): void {
    this.log('info', args);
  }

  /**
   * Log a warning message.
   * @param args - Arguments to log
   */
  warn(...args: unknown[]): void {
    this.log('warn', args);
  }

  /**
   * Log an error message.
   * @param args - Arguments to log
   */
  error(...args: unknown[]): void {
    this.log('error', args);
  }

  /**
   * Log a fatal message (most severe).
   * @param args - Arguments to log
   */
  fatal(...args: unknown[]): void {
    this.log('fatal', args);
  }

  // ============================================================================
  // Level Management
  // ============================================================================

  /**
   * Set the minimum log level.
   * @param level - The log level to set
   */
  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  /**
   * Get the current log level.
   * @returns The current log level
   */
  getLevel(): LogLevel {
    return this.options.level;
  }

  // ============================================================================
  // Transport Management
  // ============================================================================

  /**
   * Add a transport to the logger.
   * @param transport - The transport to add
   */
  addTransport(transport: Transport): void {
    this.transports.push(transport);
  }

  /**
   * Remove a transport from the logger.
   * @param transport - The transport to remove
   */
  removeTransport(transport: Transport): void {
    const index = this.transports.indexOf(transport);
    if (index !== -1) {
      this.transports.splice(index, 1);
    }
  }

  // ============================================================================
  // Child Logger
  // ============================================================================

  /**
   * Create a child logger with additional prefix and context.
   * @param options - Child logger options
   * @returns A new Logger instance
   */
  child(options: ChildLoggerOptions = {}): Logger {
    const combinedPrefix = options.prefix
      ? this.prefix
        ? `${this.prefix}:${options.prefix}`
        : options.prefix
      : this.prefix;

    const combinedContext = {
      ...this.context,
      ...(options.context ?? {}),
    };

    return new Logger({
      level: options.level ?? this.options.level,
      silent: options.silent ?? this.options.silent,
      enableColors: this.options.enableColors,
      timestamp: this.options.timestamp,
      formatter: this.options.formatter,
      json: this.options.json,
      transports: this.transports.slice(),
      prefix: combinedPrefix,
      context: combinedContext,
    });
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Destroy the logger and all its transports.
   * Calls destroy() on all registered transports.
   */
  async destroy(): Promise<void> {
    const destroyPromises = this.transports.map(async (transport) => {
      if (typeof transport.destroy === 'function') {
        await transport.destroy();
      }
    });

    await Promise.all(destroyPromises);
    this.transports.length = 0;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Core logging method - all public methods delegate here.
   * @param level - The log level
   * @param args - The arguments to log
   */
  private log(level: LogLevel, args: unknown[]): void {
    // Check if level passes the threshold
    if (!this.shouldLog(level)) return;

    // Build the log entry
    const entry: LogEntry = {
      level,
      timestamp: formatTimestamp(this.options.timestamp),
      args,
      prefix: this.prefix,
      context: this.context,
    };

    // Write to console (unless silent)
    if (!this.options.silent) {
      this.writeToConsole(level, entry);
    }

    // Send to transports (always, even when silent)
    for (const transport of this.transports) {
      this.dispatchToTransport(transport, entry);
    }
  }

  /**
   * Write a log entry to the console.
   * @param level - The log level
   * @param entry - The log entry
   */
  private writeToConsole(level: LogLevel, entry: LogEntry): void {
    const method = CONSOLE_METHODS[level];

    // Formatter takes priority if provided
    if (this.options.formatter) {
      console[method](this.options.formatter(entry));
      return;
    }

    if (this.options.json) {
      console[method](formatJson(entry));
      return;
    }

    const label = getColoredLabel(entry.level, this.options.enableColors);
    const prefixStr = entry.prefix ? ` [${entry.prefix}]` : '';
    const message = buildMessage(entry.args);
    console[method](`${label} ${entry.timestamp}${prefixStr}`, message);
  }

  /**
   * Dispatch a log entry to a transport.
   * @param transport - The transport
   * @param entry - The log entry
   */
  private dispatchToTransport(transport: Transport, entry: LogEntry): void {
    try {
      const result = transport.log(entry);
      if (result instanceof Promise) {
        result.catch(() => {
          // Swallow transport errors to prevent logger from crashing
        });
      }
    } catch {
      // Swallow transport errors to prevent logger from crashing
    }
  }

  /**
   * Check if a log level should be output.
   * @param level - The log level to check
   * @returns True if the message should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return (
      LOG_LEVEL_PRIORITIES[level] >= LOG_LEVEL_PRIORITIES[this.options.level]
    );
  }
}
