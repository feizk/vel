export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type TimestampType = 'iso' | 'locale' | 'custom';

export interface TimestampTypes {
  ISO: 'iso';
  Locale: 'locale';
  Custom: 'custom';
}

export interface LoggerOptions {
  enableColors?: boolean;
  formatTimestamp?: (
    types: TimestampTypes,
    date?: Date,
  ) => [TimestampType, string];
  formatLog?: (level: string, timestamp: string, args: unknown[]) => string;
  level?: LogLevel;
}
