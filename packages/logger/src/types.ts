export interface LoggerOptions {
  enableColors?: boolean;
  timestampFormat?: 'iso' | 'locale' | ((date: Date) => string);
  logFormat?: (level: string, timestamp: string, args: unknown[]) => string;
}
