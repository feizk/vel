import type { LogLevel } from '@feizk/logger';

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
  formatter?: (entry: {
    level: LogLevel;
    timestamp: string;
    args: unknown[];
    prefix?: string;
    context: Record<string, unknown>;
  }) => string;
  /** Map log levels to Discord embed colors */
  levelColors?: Record<LogLevel, number>;
  /** Whether to include context in embeds (default: true) */
  includeContext?: boolean;
  /** Whether to send as webhook payload directly (advanced) */
  customPayload?: (entry: {
    level: LogLevel;
    timestamp: string;
    args: unknown[];
    prefix?: string;
    context: Record<string, unknown>;
  }) => DiscordWebhookPayload;
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
