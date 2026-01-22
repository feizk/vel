import type { LoggerOptions, LogLevel, TimestampTypes } from './types';
import { formatTimestamp, formatLog, TIMESTAMP_TYPES } from './utils';

import type { TimestampType } from './types';

const defaultFormatTimestamp = (
  types: TimestampTypes,
  date: Date = new Date(),
): [TimestampType, string] => [types.ISO, date.toISOString()];

const LOG_LEVEL_PRIORITIES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * A simple logger with colored outputs and timestamps.
 */
export class Logger {
  private options: LoggerOptions;
  private level: LogLevel;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      enableColors: options.enableColors ?? true,
      formatTimestamp: options.formatTimestamp ?? defaultFormatTimestamp,
      formatLog: options.formatLog,
    };
    this.level = options.level ?? 'debug';
  }

  /**
   * Sets the minimum log level for filtering messages.
   * @param level - The log level to set.
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Checks if a log level should be output based on the current log level.
   * @param level - The log level to check.
   * @returns True if the message should be logged.
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITIES[level] >= LOG_LEVEL_PRIORITIES[this.level];
  }

  /**
   * Logs an info message.
   * @param args - The arguments to log.
   */
  info(...args: unknown[]): void {
    if (!this.shouldLog('info')) return;
    const timestamp = formatTimestamp(
      this.options.formatTimestamp!,
      TIMESTAMP_TYPES,
    );
    console.log(...formatLog('[INFO]', timestamp, args, this.options));
  }

  /**
   * Logs a warning message.
   * @param args - The arguments to log.
   */
  warn(...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;
    const timestamp = formatTimestamp(
      this.options.formatTimestamp!,
      TIMESTAMP_TYPES,
    );
    console.log(...formatLog('[WARN]', timestamp, args, this.options));
  }

  /**
   * Logs an error message.
   * @param args - The arguments to log.
   */
  error(...args: unknown[]): void {
    if (!this.shouldLog('error')) return;
    const timestamp = formatTimestamp(
      this.options.formatTimestamp!,
      TIMESTAMP_TYPES,
    );
    console.log(...formatLog('[ERROR]', timestamp, args, this.options));
  }

  /**
   * Logs a debug message.
   * @param args - The arguments to log.
   */
  debug(...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;
    const timestamp = formatTimestamp(
      this.options.formatTimestamp!,
      TIMESTAMP_TYPES,
    );
    console.log(...formatLog('[DEBUG]', timestamp, args, this.options));
  }
}
