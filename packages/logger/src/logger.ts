import type { LoggerOptions, LogLevel } from './types';
import { formatTimestamp, formatLog } from './utils';

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
  private logLevel: LogLevel;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      enableColors: options.enableColors ?? true,
      timestampFormat: options.timestampFormat ?? 'iso',
      logFormat: options.logFormat,
    };
    this.logLevel = options.logLevel ?? 'debug';
  }

  /**
   * Sets the minimum log level for filtering messages.
   * @param level - The log level to set.
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Checks if a log level should be output based on the current log level.
   * @param level - The log level to check.
   * @returns True if the message should be logged.
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITIES[level] >= LOG_LEVEL_PRIORITIES[this.logLevel];
  }

  /**
   * Logs an info message.
   * @param args - The arguments to log.
   */
  info(...args: unknown[]): void {
    if (!this.shouldLog('info')) return;
    const timestamp = formatTimestamp(this.options);
    console.log(...formatLog('[INFO]', timestamp, args, this.options));
  }

  /**
   * Logs a warning message.
   * @param args - The arguments to log.
   */
  warn(...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;
    const timestamp = formatTimestamp(this.options);
    console.log(...formatLog('[WARN]', timestamp, args, this.options));
  }

  /**
   * Logs an error message.
   * @param args - The arguments to log.
   */
  error(...args: unknown[]): void {
    if (!this.shouldLog('error')) return;
    const timestamp = formatTimestamp(this.options);
    console.log(...formatLog('[ERROR]', timestamp, args, this.options));
  }

  /**
   * Logs a debug message.
   * @param args - The arguments to log.
   */
  debug(...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;
    const timestamp = formatTimestamp(this.options);
    console.log(...formatLog('[DEBUG]', timestamp, args, this.options));
  }
}
