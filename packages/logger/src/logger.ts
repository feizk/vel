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
  private discordQueue: Array<{
    embed: Record<string, unknown>;
    retryCount: number;
  }> = [];
  private isProcessing: boolean = false;
  private processTimeout?: ReturnType<typeof setTimeout>;

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
  private sendToDiscord(
    level: LogLevel,
    timestamp: string,
    args: unknown[],
  ): void {
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

    this.discordQueue.push({ embed, retryCount: 0 });

    if (!this.isProcessing) {
      this.isProcessing = true;
      setTimeout(() => this.processQueue(), 0);
    }
  }

  /**
   * Processes the Discord queue by sending batches of embeds.
   */
  private processQueue(): void {
    if (this.discordQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const discord = this.options.discord!;
    const batchSize = discord.batchSize ?? 10;
    const batch = this.discordQueue.splice(0, batchSize);

    this.sendBatch(batch.map((item) => item.embed))
      .then(() => {
        // Schedule next batch after delay
        const delay = discord.batchDelay ?? 2000;
        this.processTimeout = setTimeout(() => this.processQueue(), delay);
      })
      .catch(() => {
        // On failure, put back the batch with incremented retry count
        const maxRetries = discord.maxRetries ?? 3;
        const retryItems = batch
          .filter((item) => item.retryCount < maxRetries)
          .map((item) => ({
            ...item,
            retryCount: item.retryCount + 1,
          }));

        this.discordQueue.unshift(...retryItems);
        // If retries exhausted, drop them

        // Schedule next attempt after retry delay
        const retryDelayBase = discord.retryDelayBase ?? 1000;
        const delay = retryDelayBase * Math.pow(2, batch[0]?.retryCount ?? 0);
        this.processTimeout = setTimeout(() => this.processQueue(), delay);
      });
  }

  /**
   * Sends a batch of embeds to Discord.
   * @param embeds - The embeds to send.
   */
  private async sendBatch(embeds: Record<string, unknown>[]): Promise<void> {
    const discord = this.options.discord!;
    await fetch(discord.webhookURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds }),
    });
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
