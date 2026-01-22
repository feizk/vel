import chalk from 'chalk';
import type { LoggerOptions, TimestampTypes } from './types';

export const TIMESTAMP_TYPES: TimestampTypes = {
  ISO: 'iso',
  Locale: 'locale',
  Custom: 'custom',
};

export function formatTimestamp(
  formatTimestampFn: NonNullable<LoggerOptions['formatTimestamp']>,
  types: TimestampTypes,
  date: Date = new Date(),
): string {
  const [, timestamp] = formatTimestampFn(types, date);
  return timestamp;
}

export function getColor(level: string, enableColors: boolean): string {
  if (!enableColors) return level;
  const colors: Record<string, string> = {
    '[INFO]': chalk.blue(level),
    '[WARN]': chalk.yellow(level),
    '[ERROR]': chalk.red(level),
    '[DEBUG]': chalk.gray(level),
  };
  return colors[level] || level;
}

export function formatLog(
  level: string,
  timestamp: string,
  args: unknown[],
  options: LoggerOptions,
): [string, ...unknown[]] {
  const { formatLog, enableColors = true } = options;
  const coloredLevel = getColor(level, enableColors);
  if (formatLog) {
    return [formatLog(coloredLevel, timestamp, args)];
  }
  return [`${coloredLevel} ${timestamp}`, ...args];
}
