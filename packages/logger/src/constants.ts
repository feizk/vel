import type { LogLevel } from './types';

/**
 * Log level priorities ordered by severity (lower = less severe).
 */
export const LOG_LEVEL_PRIORITIES: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

/**
 * ANSI color codes for colored console output.
 * No external dependencies needed.
 */
export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
} as const;

/**
 * Color codes mapped to log levels.
 */
export const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: ANSI.gray,
  debug: ANSI.cyan,
  info: ANSI.blue,
  warn: ANSI.yellow,
  error: ANSI.red,
  fatal: `${ANSI.bgRed}${ANSI.white}${ANSI.bold}`,
};

/**
 * Text labels for log levels.
 */
export const LEVEL_LABELS: Record<LogLevel, string> = {
  trace: '[TRACE]',
  debug: '[DEBUG]',
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
  fatal: '[FATAL]',
};

/**
 * Console methods to use for each log level.
 */
export const CONSOLE_METHODS: Record<
  LogLevel,
  'log' | 'warn' | 'error' | 'debug' | 'trace'
> = {
  trace: 'trace',
  debug: 'debug',
  info: 'log',
  warn: 'warn',
  error: 'error',
  fatal: 'error',
};

/**
 * Preset timestamp formats.
 */
export const TIMESTAMP_PRESETS: Record<
  'iso' | 'locale',
  (date: Date) => string
> = {
  iso: (date: Date) => date.toISOString(),
  locale: (date: Date) => date.toLocaleString(),
};
