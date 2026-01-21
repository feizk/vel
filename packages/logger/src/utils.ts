import chalk from 'chalk';
import type { LoggerOptions } from './types';

export function formatTimestamp(
  options: LoggerOptions,
  date: Date = new Date(),
): string {
  const { timestampFormat = 'iso' } = options;
  if (typeof timestampFormat === 'function') {
    return timestampFormat(date);
  }
  switch (timestampFormat) {
    case 'locale':
      return date.toLocaleString();
    case 'iso':
    default:
      return date.toISOString();
  }
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
  const { logFormat, enableColors = true } = options;
  const coloredLevel = getColor(level, enableColors);
  if (logFormat) {
    return [logFormat(coloredLevel, timestamp, args)];
  }
  return [`${coloredLevel} ${timestamp}`, ...args];
}
