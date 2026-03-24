import {
  ANSI,
  LEVEL_COLORS,
  LEVEL_LABELS,
  TIMESTAMP_PRESETS,
} from './constants';
import type { LogEntry, LogLevel, TimestampOption } from './types';

/**
 * Cache for colored labels to improve performance.
 * Pre-computed ANSI-colored labels for each log level.
 */
const coloredLabelCache = new Map<`${LogLevel}:${boolean}`, string>();

/**
 * Get the colored label for a log level.
 * Results are cached for performance.
 * @param level - The log level
 * @param enableColors - Whether to apply colors
 * @returns The label string (colored if enabled)
 */
export function getColoredLabel(
  level: LogLevel,
  enableColors: boolean,
): string {
  const cacheKey = `${level}:${enableColors}` as const;
  const cached = coloredLabelCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const label = LEVEL_LABELS[level];
  if (!enableColors) {
    coloredLabelCache.set(cacheKey, label);
    return label;
  }

  const color = LEVEL_COLORS[level];
  const result = `${color}${label}${ANSI.reset}`;
  coloredLabelCache.set(cacheKey, result);
  return result;
}

/**
 * Format a timestamp based on the provided option.
 * @param option - Preset string or custom formatter
 * @param date - Date to format (default: current date)
 * @returns Formatted timestamp string
 */
export function formatTimestamp(
  option: TimestampOption,
  date: Date = new Date(),
): string {
  if (typeof option === 'function') {
    return option(date);
  }
  const preset = TIMESTAMP_PRESETS[option];
  return preset(date);
}

/**
 * Format a log entry as JSON for structured logging.
 * @param entry - The log entry to format
 * @returns JSON string representation
 */
export function formatJson(entry: LogEntry): string {
  const message = entry.args.map(formatArg).join(' ');

  const output: Record<string, unknown> = {
    level: entry.level,
    timestamp: entry.timestamp,
    message,
  };

  if (entry.prefix) {
    output.prefix = entry.prefix;
  }

  if (Object.keys(entry.context).length > 0) {
    output.context = entry.context;
  }

  return JSON.stringify(output);
}

/**
 * Format a value for logging, handling special types like Error, BigInt, etc.
 * @param arg - The value to format
 * @returns Formatted string representation
 */
function formatArg(arg: unknown): string {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'number') return String(arg);
  if (typeof arg === 'boolean') return String(arg);
  if (typeof arg === 'bigint') return `${arg}n`;
  if (typeof arg === 'symbol') return arg.toString();

  // Handle Error objects specially
  if (arg instanceof Error) {
    const parts = [arg.message];
    if (arg.name && arg.name !== 'Error') parts.unshift(arg.name);
    if (arg.stack) parts.push(arg.stack);
    return parts.join(': ');
  }

  // Handle arrays - use compact JSON for cleaner output
  if (Array.isArray(arg)) {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }

  // Handle objects with circular reference safe stringify
  try {
    return JSON.stringify(arg, getCircularReplacer());
  } catch {
    return String(arg);
  }
}

/**
 * Returns a replacer function for JSON.stringify that handles circular references.
 */
function getCircularReplacer(): (key: string, value: unknown) => unknown {
  const seen = new WeakSet();
  return (_key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

/**
 * Build the message string from log arguments.
 * @param args - The log arguments
 * @returns Formatted message string
 */
export function buildMessage(args: unknown[]): string {
  return args.map(formatArg).join(' ');
}
