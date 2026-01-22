export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type TimestampType = 'iso' | 'locale' | 'custom';

export interface TimestampTypes {
  ISO: 'iso';
  Locale: 'locale';
  Custom: 'custom';
}

export interface DiscordOptions {
  enable: boolean;
  webhookURL: string;
  formatEmbed?: (
    level: LogLevel,
    timestamp: string,
    message: string,
  ) => Record<string, unknown>;
}

export interface LoggerOptions {
  enableColors?: boolean;
  formatTimestamp?: (
    types: TimestampTypes,
    date?: Date,
  ) => [TimestampType, string];
  formatLog?: (level: string, timestamp: string, args: unknown[]) => string;
  level?: LogLevel;
  discord?: DiscordOptions;
}
