import type { LoggerOptions } from './types';
import { formatTimestamp, formatLog } from './utils';

/**
 * A simple logger with colored outputs and timestamps.
 */
export class Logger {
  private options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      enableColors: options.enableColors ?? true,
      timestampFormat: options.timestampFormat ?? 'iso',
      logFormat: options.logFormat,
    };
  }

  /**
   * Logs an info message.
   * @param args - The arguments to log.
   */
  info(...args: unknown[]): void {
    const timestamp = formatTimestamp(this.options);
    console.log(...formatLog('[INFO]', timestamp, args, this.options));
  }

  /**
   * Logs a warning message.
   * @param args - The arguments to log.
   */
  warn(...args: unknown[]): void {
    const timestamp = formatTimestamp(this.options);
    console.log(...formatLog('[WARN]', timestamp, args, this.options));
  }

  /**
   * Logs an error message.
   * @param args - The arguments to log.
   */
  error(...args: unknown[]): void {
    const timestamp = formatTimestamp(this.options);
    console.log(...formatLog('[ERROR]', timestamp, args, this.options));
  }

  /**
   * Logs a debug message.
   * @param args - The arguments to log.
   */
  debug(...args: unknown[]): void {
    const timestamp = formatTimestamp(this.options);
    console.log(...formatLog('[DEBUG]', timestamp, args, this.options));
  }
}
