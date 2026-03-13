import {
  type Transport,
  type LogEntry,
  type LogLevel,
  LOG_LEVEL_PRIORITIES,
} from '@feizk/logger';
import {
  type DiscordTransportOptions,
  type DiscordWebhookPayload,
  type DiscordEmbed,
  type BatchingOptions,
  type CompressionOptions,
  type QueuePriority,
  type DiscordLogEntry,
  DEFAULT_LEVEL_COLORS,
  DEFAULT_MIN_LEVEL,
  DEFAULT_BATCHING_OPTIONS,
  DEFAULT_COMPRESSION_OPTIONS,
  DEFAULT_CIRCUIT_BREAKER_OPTIONS,
  DEFAULT_PERSISTENT_QUEUE_OPTIONS,
} from './types';
import { CircuitBreaker } from './circuit-breaker';
import { PersistentQueue } from './persistent-queue';

/**
 * Discord transport for @feizk/logger.
 * Sends log entries to a Discord webhook with batching and compression support.
 *
 * @example
 * ```typescript
 * import { Logger } from '@feizk/logger';
 * import { DiscordTransport } from '@feizk/logger-discord';
 *
 * const logger = new Logger();
 * logger.addTransport(new DiscordTransport({
 *   webhookURL: 'https://discord.com/api/webhooks/...',
 * }));
 *
 * logger.info('Hello Discord!');
 * ```
 */
export class DiscordTransport implements Transport {
  private readonly webhookURL: string;
  private readonly username: string;
  private readonly avatarURL?: string;
  private readonly level: LogLevel;
  private readonly formatter?: DiscordTransportOptions['formatter'];
  private readonly levelColors: Record<LogLevel, number>;
  private readonly includeContext: boolean;
  private readonly customPayload?: DiscordTransportOptions['customPayload'];
  private readonly batching: Required<BatchingOptions>;
  private readonly compression: Required<CompressionOptions>;

  private batch: DiscordLogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushPromise: Promise<void> = Promise.resolve();
  private isDestroyed = false;
  private circuitBreaker?: CircuitBreaker;
  private persistentQueue?: PersistentQueue;
  private queueProcessTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Create a new Discord transport instance.
   * @param options - Configuration options
   */
  constructor(options: DiscordTransportOptions) {
    if (!options.webhookURL) {
      throw new Error('DiscordTransport requires a webhookURL');
    }

    this.webhookURL = options.webhookURL;
    this.username = options.username ?? 'Logger';
    this.avatarURL = options.avatarURL;
    this.level = options.level ?? DEFAULT_MIN_LEVEL;
    this.formatter = options.formatter;
    this.levelColors = options.levelColors ?? DEFAULT_LEVEL_COLORS;
    this.includeContext = options.includeContext ?? true;
    this.customPayload = options.customPayload;

    // Merge batching options with defaults
    this.batching = {
      ...DEFAULT_BATCHING_OPTIONS,
      ...options.batching,
    };

    // Merge compression options with defaults
    this.compression = {
      ...DEFAULT_COMPRESSION_OPTIONS,
      ...options.compression,
    };

    // Initialize circuit breaker if enabled
    if (options.circuitBreaker) {
      this.circuitBreaker = new CircuitBreaker({
        ...DEFAULT_CIRCUIT_BREAKER_OPTIONS,
        ...options.circuitBreaker,
      });
    }

    // Initialize persistent queue if enabled
    if (options.persistentQueue) {
      this.persistentQueue = new PersistentQueue({
        ...DEFAULT_PERSISTENT_QUEUE_OPTIONS,
        ...options.persistentQueue,
      });
    }
  }

  /**
   * Check if a log level should be sent to Discord.
   * @param level - The log level to check
   * @returns Whether the level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITIES[level] >= LOG_LEVEL_PRIORITIES[this.level];
  }

  /**
   * Check if a log level should trigger immediate flush.
   * @param level - The log level to check
   * @returns Whether to flush immediately
   */
  private shouldFlushImmediately(level: LogLevel): boolean {
    return this.batching.immediateFlushLevels.includes(level);
  }

  /**
   * Convert log entry args to a formatted string.
   * @param args - The log arguments
   * @returns Formatted string
   */
  private formatArgs(args: unknown[]): string {
    return args.map((arg) => this.stringifyArg(arg)).join(' ');
  }

  /**
   * Convert a single argument to a string representation.
   * Handles Error objects specially to include message and stack.
   * @param arg - The argument to stringify
   * @returns Formatted string
   */
  private stringifyArg(arg: unknown): string {
    // Handle Error objects specially
    if (arg instanceof Error) {
      let result = arg.message;
      if (arg.stack) {
        // Get just the first line of the stack (the error type and message)
        const stackLines = arg.stack.split('\n').slice(1, 4);
        if (stackLines.length > 0) {
          result += '\n' + stackLines.join('\n');
        }
      }
      return result;
    }

    // Handle objects and arrays with compact formatting
    if (typeof arg === 'object' && arg !== null) {
      try {
        // Use compact JSON (no indentation) but preserve arrays on single line
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }

    return String(arg);
  }

  /**
   * Compress a large string by truncating with an indicator.
   * For Discord embeds, we truncate instead of gzip since we can't easily
   * upload file attachments via webhooks without multipart/form-data.
   * @param content - The content to compress
   * @param maxLength - Maximum length allowed
   * @returns Compressed content
   */
  private compressContent(content: string, maxLength: number): string {
    if (!this.compression.enabled || content.length <= maxLength) {
      return content;
    }

    // Truncate and add indicator
    const indicator = '\n\n... (truncated)';
    const truncateLength = maxLength - indicator.length;
    return content.slice(0, truncateLength) + indicator;
  }

  /**
   * Build a single Discord embed for a log entry.
   * @param entry - The log entry
   * @returns Discord embed object
   */
  private buildSingleEmbed(entry: DiscordLogEntry): DiscordEmbed {
    // Build the message
    let message: string;
    if (this.formatter) {
      message = this.formatter(entry);
    } else {
      const levelLabel = entry.level.toUpperCase();
      const prefix = entry.prefix ? `[${entry.prefix}] ` : '';
      message = `**${levelLabel}** ${prefix}${this.formatArgs(entry.args)}`;
    }

    // Discord embed description limit is 4096 characters
    const maxDescriptionLength = 4096;
    const truncatedMessage =
      message.length > maxDescriptionLength
        ? message.slice(0, maxDescriptionLength - 3) + '...'
        : message;

    // Build embed
    const embed: DiscordEmbed = {
      description: truncatedMessage,
      timestamp: entry.timestamp,
      color: this.levelColors[entry.level],
      fields: [],
    };

    // Add context to embed if enabled
    if (this.includeContext && Object.keys(entry.context).length > 0) {
      let contextStr = JSON.stringify(entry.context, null, 2);

      // Discord has a field value limit of 1024 characters
      // Account for markdown code block wrapper: ```json\n...\n``` = 12 chars
      const markdownWrapperLength = 12;
      const maxFieldLength = 1024 - markdownWrapperLength;

      // Apply compression threshold first
      if (
        this.compression.enabled &&
        contextStr.length > this.compression.threshold
      ) {
        const indicator = '\n\n... (truncated)';
        const truncateLength = maxFieldLength - indicator.length;
        contextStr = contextStr.slice(0, truncateLength) + indicator;
      }

      // Ensure final value fits within Discord limit
      if (contextStr.length > maxFieldLength) {
        contextStr = contextStr.slice(0, maxFieldLength - 3) + '...';
      }

      const value = `\`\`\`json\n${contextStr}\n\`\`\``;

      embed.fields!.push({
        name: 'Context',
        value,
        inline: false,
      });
    }

    // Add prefix as separate field if present
    if (entry.prefix) {
      embed.fields!.unshift({
        name: 'Prefix',
        value: entry.prefix,
        inline: true,
      });
    }

    if (entry.id) {
      embed.fields!.unshift({
        name: 'Log ID',
        value: `\`${entry.id}\``,
        inline: true,
      });
    }

    if (entry.references && entry.references.length > 0) {
      embed.fields!.push({
        name: 'References',
        value: entry.references
          .map((reference: string) => `\`${reference}\``)
          .join(', '),
        inline: false,
      });
    }

    if (embed.fields && embed.fields.length === 0) {
      delete embed.fields;
    }

    return embed;
  }

  /**
   * Build a Discord webhook payload for multiple log entries.
   * Discord supports up to 10 embeds per message.
   * @param entries - The log entries
   * @returns Discord webhook payload
   */
  private buildBatchPayload(entries: DiscordLogEntry[]): DiscordWebhookPayload {
    // Use custom payload if provided (only works with single entry)
    if (this.customPayload && entries.length === 1) {
      const entry = entries[0];
      return this.customPayload(entry);
    }

    // Build embeds for all entries
    const embeds = entries.map((entry) => this.buildSingleEmbed(entry));

    return {
      username: this.username,
      avatar_url: this.avatarURL,
      embeds,
    };
  }

  /**
   * Send payload to Discord webhook with rate limit handling and circuit breaker.
   * @param payload - The webhook payload to send
   * @param retryCount - Current retry attempt number
   * @param entry - Optional log entry for queueing on failure
   */
  private async sendWebhook(
    payload: DiscordWebhookPayload,
    retryCount = 0,
    entry?: DiscordLogEntry,
  ): Promise<void> {
    const MAX_RETRIES = 3;

    // Check circuit breaker before attempting
    if (this.circuitBreaker && !this.circuitBreaker.canExecute()) {
      // Circuit is open, queue the message if persistent queue is enabled
      if (this.persistentQueue && entry) {
        const priority = this.getPriorityForLevel(entry.level);
        await this.persistentQueue.enqueue(payload, priority);
      }
      return;
    }

    try {
      const response = await fetch(this.webhookURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Handle rate limiting (429 status)
      if (response.status === 429) {
        // Try to parse retry_after from JSON body, fallback to Retry-After header
        let retryAfter = 1; // Default 1 second fallback

        try {
          const errorBody = (await response.json()) as {
            retry_after?: number;
          };
          if (errorBody.retry_after && errorBody.retry_after > 0) {
            retryAfter = errorBody.retry_after;
          }
        } catch {
          // If JSON parsing fails, try the header
          const headerRetry = response.headers.get('Retry-After');
          if (headerRetry) {
            const parsed = parseFloat(headerRetry);
            if (!isNaN(parsed) && parsed > 0) {
              retryAfter = parsed;
            }
          }
        }

        // Retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          // Wait for the specified duration (retry_after is in seconds)
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfter * 1000),
          );
          // Retry the request
          return this.sendWebhook(payload, retryCount + 1, entry);
        }
        // Max retries exceeded, queue if persistent queue is enabled
        if (this.persistentQueue && entry) {
          const priority = this.getPriorityForLevel(entry.level);
          await this.persistentQueue.enqueue(payload, priority);
          this.scheduleQueueProcessing();
        }
        return;
      }

      if (response.ok) {
        // Record success for circuit breaker
        this.circuitBreaker?.recordSuccess();
      } else {
        // Record failure for circuit breaker
        this.circuitBreaker?.recordFailure();

        const errorText = await response.text();
        console.error(
          `[DiscordTransport] Failed to send log: ${response.status} ${response.statusText}`,
          errorText,
          response,
        );

        // Queue the message if persistent queue is enabled
        if (this.persistentQueue && entry) {
          const priority = this.getPriorityForLevel(entry.level);
          await this.persistentQueue.enqueue(payload, priority);
          this.scheduleQueueProcessing();
        }
      }
    } catch (error) {
      // Record failure for circuit breaker
      this.circuitBreaker?.recordFailure();

      console.error(
        `[DiscordTransport] Error sending log:`,
        error instanceof Error ? error.message : error,
      );

      // Queue the message if persistent queue is enabled
      if (this.persistentQueue && entry) {
        const priority = this.getPriorityForLevel(entry.level);
        await this.persistentQueue.enqueue(payload, priority);
        this.scheduleQueueProcessing();
      }
    }
  }

  /**
   * Flush the current batch of logs to Discord.
   */
  private async flush(): Promise<void> {
    if (this.batch.length === 0) {
      return;
    }

    // Clear the timer if it exists
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Take current batch and reset
    const currentBatch = this.batch;
    this.batch = [];

    // Build and send payload
    const payload = this.buildBatchPayload(currentBatch);

    // Check circuit breaker before attempting
    if (this.circuitBreaker && !this.circuitBreaker.canExecute()) {
      // Circuit is open, queue all messages individually
      if (this.persistentQueue) {
        for (const entry of currentBatch) {
          const singlePayload = this.buildBatchPayload([entry]);
          const priority = this.getPriorityForLevel(entry.level);
          await this.persistentQueue.enqueue(singlePayload, priority);
        }
        this.scheduleQueueProcessing();
      }
      return;
    }

    try {
      const response = await fetch(this.webhookURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        this.circuitBreaker?.recordSuccess();
      } else {
        this.circuitBreaker?.recordFailure();

        // Queue all messages individually on failure
        if (this.persistentQueue) {
          for (const entry of currentBatch) {
            const singlePayload = this.buildBatchPayload([entry]);
            const priority = this.getPriorityForLevel(entry.level);
            await this.persistentQueue.enqueue(singlePayload, priority);
          }
          this.scheduleQueueProcessing();
        }
      }
    } catch {
      this.circuitBreaker?.recordFailure();

      // Queue all messages individually on error
      if (this.persistentQueue) {
        for (const entry of currentBatch) {
          const singlePayload = this.buildBatchPayload([entry]);
          const priority = this.getPriorityForLevel(entry.level);
          await this.persistentQueue.enqueue(singlePayload, priority);
        }
        this.scheduleQueueProcessing();
      }
    }
  }

  /**
   * Schedule a flush after the debounce delay.
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      return; // Already scheduled
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushPromise = this.flushPromise.then(() => this.flush());
    }, this.batching.debounceMs);
  }

  /**
   * Send a log entry to Discord.
   * Implements batching: accumulates logs and sends them in batches of up to 10 embeds.
   * @param entry - The log entry to send
   */
  async log(entry: LogEntry): Promise<void> {
    const discordEntry = entry as DiscordLogEntry;
    // Check if this level should be logged
    if (!this.shouldLog(discordEntry.level)) {
      return;
    }

    // If destroyed, don't accept new logs
    if (this.isDestroyed) {
      return;
    }

    // If batching is disabled, send immediately
    if (!this.batching.enabled) {
      const payload = this.buildBatchPayload([discordEntry]);
      await this.sendWebhook(payload, 0, discordEntry);
      return;
    }

    // Add to batch
    this.batch.push(discordEntry);

    // Check if we should flush immediately
    if (
      this.shouldFlushImmediately(discordEntry.level) ||
      this.batch.length >= this.batching.maxBatchSize
    ) {
      // Chain onto the flush promise to maintain order
      this.flushPromise = this.flushPromise.then(() => this.flush());
      return;
    }

    // Schedule a debounced flush for non-critical logs
    this.scheduleFlush();
  }

  /**
   * Get priority level for a log level.
   * @param level - Log level
   * @returns Queue priority
   */
  private getPriorityForLevel(level: LogLevel): QueuePriority {
    switch (level) {
      case 'fatal':
        return 'critical';
      case 'error':
        return 'high';
      case 'warn':
        return 'normal';
      default:
        return 'low';
    }
  }

  /**
   * Schedule periodic queue processing.
   */
  private scheduleQueueProcessing(): void {
    if (!this.persistentQueue || this.queueProcessTimer) {
      return;
    }

    const processQueue = async (): Promise<void> => {
      if (this.isDestroyed || !this.persistentQueue) {
        this.queueProcessTimer = null;
        return;
      }

      // Skip if circuit breaker is open
      if (this.circuitBreaker?.isOpen()) {
        this.queueProcessTimer = setTimeout(processQueue, 1000);
        return;
      }

      // Skip if queue is empty - don't schedule next check immediately
      // to allow process to exit when idle
      if (this.persistentQueue.isEmpty()) {
        this.queueProcessTimer = null;
        return;
      }

      const message = this.persistentQueue.peek();
      if (!message) {
        this.queueProcessTimer = null;
        return;
      }

      try {
        await this.sendWebhook(message.payload as DiscordWebhookPayload);
        this.persistentQueue.dequeue();
      } catch {
        // Failed to send, requeue with retry count
        const requeued = this.persistentQueue.requeue(message);
        if (!requeued) {
          // Max retries exceeded, message dropped
          this.persistentQueue.dequeue();
        }
      }

      // Schedule next processing
      this.queueProcessTimer = setTimeout(processQueue, 100);
    };

    // Start processing
    void processQueue();
  }

  /**
   * Cleanup method - flushes any pending logs.
   */
  async destroy(): Promise<void> {
    this.isDestroyed = true;

    // Clear queue processing timer
    if (this.queueProcessTimer) {
      clearTimeout(this.queueProcessTimer);
      this.queueProcessTimer = null;
    }

    // Wait for any pending flush to complete
    await this.flushPromise;

    // Flush any remaining logs
    if (this.batch.length > 0) {
      await this.flush();
    }

    // Clear any pending timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Cleanup circuit breaker
    this.circuitBreaker?.destroy();

    // Cleanup persistent queue
    await this.persistentQueue?.destroy();
  }
}
