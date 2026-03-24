import { LOG_LEVEL_PRIORITIES, CONSOLE_METHODS } from './constants';
import {
  getColoredLabel,
  formatTimestamp,
  formatJson,
  buildMessage,
} from './utils';
import type {
  LoggerOptions,
  LogLevel,
  LogEntry,
  Transport,
  ChildLoggerOptions,
} from './types';

/**
 * Internal options type with required fields
 */
interface InternalLoggerOptions {
  level: LogLevel;
  silent: boolean;
  enableColors: boolean;
  timestamp: 'iso' | 'locale' | ((date: Date) => string);
  formatter: ((entry: LogEntry) => string) | undefined;
  json: boolean;
  transports: Transport[];
  prefix: string | undefined;
  context: Record<string, unknown>;
}

/**
 * A lightweight, pluggable logger with colored outputs, structured logging, and transport support.
 */
export class Logger {
  private readonly options: InternalLoggerOptions;
  private readonly transports: Transport[];
  private readonly prefix?: string;
  private readonly context: Readonly<Record<string, unknown>>;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      level: options.level ?? 'debug',
      silent: options.silent ?? false,
      enableColors: options.enableColors ?? true,
      timestamp: options.timestamp ?? 'iso',
      formatter: options.formatter,
      json: options.json ?? false,
      transports: [...(options.transports ?? [])],
      prefix: options.prefix,
      context: { ...(options.context ?? {}) },
    };
    this.transports = this.options.transports;
    this.prefix = this.options.prefix;
    this.context = this.options.context as Readonly<Record<string, unknown>>;
  }

  trace(...args: unknown[]): void {
    this.log('trace', args);
  }

  debug(...args: unknown[]): void {
    this.log('debug', args);
  }

  info(...args: unknown[]): void {
    this.log('info', args);
  }

  warn(...args: unknown[]): void {
    this.log('warn', args);
  }

  error(...args: unknown[]): void {
    this.log('error', args);
  }

  fatal(...args: unknown[]): void {
    this.log('fatal', args);
  }

  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  getLevel(): LogLevel {
    return this.options.level;
  }

  addTransport(transport: Transport): void {
    this.transports.push(transport);
  }

  removeTransport(transport: Transport): void {
    const index = this.transports.indexOf(transport);
    if (index !== -1) {
      this.transports.splice(index, 1);
    }
  }

  child(options: ChildLoggerOptions = {}): Logger {
    const combinedPrefix = options.prefix
      ? this.prefix
        ? `${this.prefix}:${options.prefix}`
        : options.prefix
      : this.prefix;

    const combinedContext = {
      ...this.context,
      ...(options.context ?? {}),
    };

    return new Logger({
      level: options.level ?? this.options.level,
      silent: options.silent ?? this.options.silent,
      enableColors: this.options.enableColors,
      timestamp: this.options.timestamp,
      formatter: this.options.formatter,
      json: this.options.json,
      transports: this.transports.slice(),
      prefix: combinedPrefix,
      context: combinedContext,
    });
  }

  async destroy(): Promise<void> {
    const destroyPromises = this.transports.map(async (transport) => {
      if (typeof transport.destroy === 'function') {
        await transport.destroy();
      }
    });

    await Promise.all(destroyPromises);
    this.transports.length = 0;
  }

  private log(level: LogLevel, args: unknown[]): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createEntry(level, args);

    if (!this.options.silent) {
      this.writeToConsole(level, entry);
    }

    for (const transport of this.transports) {
      this.dispatchToTransport(transport, entry);
    }
  }

  private createEntry(level: LogLevel, args: unknown[]): LogEntry {
    return {
      level,
      timestamp: formatTimestamp(this.options.timestamp),
      args,
      prefix: this.prefix,
      context: this.context,
    };
  }

  private writeToConsole(level: LogLevel, entry: LogEntry): void {
    const method = CONSOLE_METHODS[level];

    if (this.options.formatter) {
      console[method](this.options.formatter(entry));
      return;
    }

    if (this.options.json) {
      console[method](formatJson(entry));
      return;
    }

    const label = getColoredLabel(entry.level, this.options.enableColors);
    const prefixStr = entry.prefix ? ` [${entry.prefix}]` : '';
    const message = buildMessage(entry.args);
    console[method](`${label} ${entry.timestamp}${prefixStr}`, message);
  }

  private dispatchToTransport(transport: Transport, entry: LogEntry): void {
    try {
      const result = transport.log(entry);
      if (result instanceof Promise) {
        result.catch(() => {
          // Swallow transport errors
        });
      }
    } catch {
      // Swallow transport errors
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return (
      LOG_LEVEL_PRIORITIES[level] >= LOG_LEVEL_PRIORITIES[this.options.level]
    );
  }
}
