import type { LoggerOptions, LogLevel, TimestampTypes } from './types';
import {
  formatTimestamp,
  formatLog,
  TIMESTAMP_TYPES,
  getDiscordColor,
  generateId,
} from './utils';

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
      discord: options.discord,
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
   * Sends a log message to Discord via webhook if configured.
   * @param level - The log level.
   * @param timestamp - The formatted timestamp.
   * @param args - The log arguments.
   */
  private async sendToDiscord(
    level: LogLevel,
    timestamp: string,
    args: unknown[],
  ): Promise<void> {
    const discord = this.options.discord;
    if (!discord?.enable) return;

    try {
      new URL(discord.webhookURL);
    } catch {
      return;
    }

    const message = args
      .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
      .join(' ');

    const title = `${level.toUpperCase()}-${generateId()}`;

    const embed = discord.formatEmbed
      ? discord.formatEmbed(level, timestamp, message)
      : {
          title,
          description: message,
          timestamp: new Date().toISOString(),
          color: getDiscordColor(level),
        };

    await fetch(discord.webhookURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    }).catch(() => {});
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
    this.sendToDiscord('info', timestamp, args);
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
    this.sendToDiscord('warn', timestamp, args);
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
    this.sendToDiscord('error', timestamp, args);
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
    this.sendToDiscord('debug', timestamp, args);
  }
}
