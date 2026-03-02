import {
  type Transport,
  type LogEntry,
  type LogLevel,
  LOG_LEVEL_PRIORITIES,
} from '@feizk/logger';
import {
  type DiscordTransportOptions,
  type DiscordWebhookPayload,
  DEFAULT_LEVEL_COLORS,
  DEFAULT_MIN_LEVEL,
} from './types';

/**
 * Discord transport for @feizk/logger.
 * Sends log entries to a Discord webhook.
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
  private queue: Promise<void>;

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
    this.queue = Promise.resolve();
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
   * Build a Discord embed for the log entry.
   * @param entry - The log entry
   * @returns Discord embed object
   */
  private buildEmbed(entry: LogEntry): DiscordWebhookPayload {
    // Use custom payload if provided
    if (this.customPayload) {
      return this.customPayload({
        level: entry.level,
        timestamp: entry.timestamp,
        args: entry.args,
        prefix: entry.prefix,
        context: entry.context,
      });
    }

    // Build the message
    let message: string;
    if (this.formatter) {
      message = this.formatter({
        level: entry.level,
        timestamp: entry.timestamp,
        args: entry.args,
        prefix: entry.prefix,
        context: entry.context,
      });
    } else {
      const levelLabel = entry.level.toUpperCase();
      const prefix = entry.prefix ? `[${entry.prefix}] ` : '';
      message = `**${levelLabel}** ${prefix}${this.formatArgs(entry.args)}`;
    }

    // Build embed
    const embed: DiscordWebhookPayload = {
      username: this.username,
      avatar_url: this.avatarURL,
      embeds: [
        {
          description: message,
          timestamp: entry.timestamp,
          color: this.levelColors[entry.level],
          fields: [],
        },
      ],
    };

    // Add context to embed if enabled
    if (this.includeContext && Object.keys(entry.context).length > 0) {
      const contextStr = JSON.stringify(entry.context, null, 2);
      // Discord has a field value limit of 1024 characters
      if (contextStr.length <= 1024) {
        embed.embeds![0].fields!.push({
          name: 'Context',
          value: `\`\`\`json\n${contextStr}\n\`\`\``,
          inline: false,
        });
      } else {
        // Truncate if too long
        embed.embeds![0].fields!.push({
          name: 'Context',
          value: `\`\`\`json\n${contextStr.slice(0, 1021)}...\n\`\`\``,
          inline: false,
        });
      }
    }

    // Add prefix as separate field if present
    if (entry.prefix) {
      embed.embeds![0].fields!.unshift({
        name: 'Prefix',
        value: entry.prefix,
        inline: true,
      });
    }

    return embed;
  }

  /**
   * Send a log entry to Discord.
   * @param entry - The log entry to send
   */
  async log(entry: LogEntry): Promise<void> {
    // Check if this level should be logged
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Chain onto the queue to ensure logs are sent in order
    this.queue = this.queue.then(async () => {
      const payload = this.buildEmbed(entry);

      try {
        const response = await fetch(this.webhookURL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `[DiscordTransport] Failed to send log: ${response.status} ${response.statusText}`,
            errorText,
          );
        }
      } catch (error) {
        console.error(
          `[DiscordTransport] Error sending log:`,
          error instanceof Error ? error.message : error,
        );
      }
    });
  }

  /**
   * Cleanup method (no-op for HTTP transport).
   */
  async destroy(): Promise<void> {
    // No cleanup needed for webhook transport
  }
}
