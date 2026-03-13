import { randomUUID } from 'node:crypto';
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
  LogMeta,
  EntryIdOptions,
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
  entryIds: Required<EntryIdOptions>;
}

const DEFAULT_MAX_STORED_ENTRIES = 1000;

const DEFAULT_ENTRY_ID_OPTIONS: Required<EntryIdOptions> = {
  enabled: false,
  generator: randomUUID,
  store: false,
  maxStoredEntries: DEFAULT_MAX_STORED_ENTRIES,
};

/**
 * A lightweight, pluggable logger with colored outputs, structured logging, and transport support.
 */
export class Logger {
  private readonly options: InternalLoggerOptions;
  private readonly transports: Transport[];
  private readonly prefix?: string;
  private readonly context: Readonly<Record<string, unknown>>;
  private readonly entryStore = new Map<string, LogEntry>();

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
      entryIds: this.resolveEntryIdOptions(options.entryIds),
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

  /**
   * Log a message with metadata (e.g. id/references).
   */
  logWithMeta(
    level: LogLevel,
    meta: LogMeta,
    ...args: unknown[]
  ): string | undefined {
    return this.log(level, args, meta);
  }

  traceWithMeta(meta: LogMeta, ...args: unknown[]): string | undefined {
    return this.log('trace', args, meta);
  }

  debugWithMeta(meta: LogMeta, ...args: unknown[]): string | undefined {
    return this.log('debug', args, meta);
  }

  infoWithMeta(meta: LogMeta, ...args: unknown[]): string | undefined {
    return this.log('info', args, meta);
  }

  warnWithMeta(meta: LogMeta, ...args: unknown[]): string | undefined {
    return this.log('warn', args, meta);
  }

  errorWithMeta(meta: LogMeta, ...args: unknown[]): string | undefined {
    return this.log('error', args, meta);
  }

  fatalWithMeta(meta: LogMeta, ...args: unknown[]): string | undefined {
    return this.log('fatal', args, meta);
  }

  /**
   * Create a new metadata object that references an existing log ID.
   */
  reference(id: string, extra: LogMeta = {}): LogMeta {
    return {
      ...extra,
      references: extra.references ? [...extra.references, id] : [id],
    };
  }

  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  getLevel(): LogLevel {
    return this.options.level;
  }

  /**
   * Find a previously indexed log entry by ID.
   */
  findById(id: string): LogEntry | undefined {
    return this.entryStore.get(id);
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
      transports: this.transports,
      prefix: combinedPrefix,
      context: combinedContext,
      entryIds: this.options.entryIds,
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
    this.entryStore.clear();
  }

  private log(
    level: LogLevel,
    args: unknown[],
    meta?: LogMeta,
  ): string | undefined {
    if (!this.shouldLog(level)) return undefined;

    const entry = this.createEntry(level, args, meta);

    if (!this.options.silent) {
      this.writeToConsole(level, entry);
    }

    for (const transport of this.transports) {
      this.dispatchToTransport(transport, entry);
    }

    return entry.id;
  }

  private createEntry(
    level: LogLevel,
    args: unknown[],
    meta?: LogMeta,
  ): LogEntry {
    const references = meta?.references?.filter(
      (id): id is string => id.length > 0,
    );
    const id = this.resolveEntryId(meta?.id);

    const entry: LogEntry = {
      id,
      references:
        references && references.length > 0
          ? [...new Set(references)]
          : undefined,
      level,
      timestamp: formatTimestamp(this.options.timestamp),
      args,
      prefix: this.prefix,
      context: this.context,
    };

    if (entry.id && this.options.entryIds.store) {
      this.storeEntry(entry.id, entry);
    }

    return entry;
  }

  private resolveEntryId(providedId?: string): string | undefined {
    if (!this.options.entryIds.enabled) {
      return providedId;
    }

    if (providedId) {
      return providedId;
    }

    return this.options.entryIds.generator();
  }

  private storeEntry(id: string, entry: LogEntry): void {
    if (this.entryStore.has(id)) {
      this.entryStore.set(id, entry);
      return;
    }

    this.entryStore.set(id, entry);
    if (this.entryStore.size <= this.options.entryIds.maxStoredEntries) {
      return;
    }

    const oldestKey = this.entryStore.keys().next().value;
    if (oldestKey) {
      this.entryStore.delete(oldestKey);
    }
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
    const idStr = entry.id ? ` [id:${entry.id}]` : '';
    const referencesStr =
      entry.references && entry.references.length > 0
        ? ` [refs:${entry.references.join(',')}]`
        : '';
    const message = buildMessage(entry.args);
    console[method](
      `${label} ${entry.timestamp}${prefixStr}${idStr}${referencesStr}`,
      message,
    );
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

  private resolveEntryIdOptions(
    options?: EntryIdOptions,
  ): Required<EntryIdOptions> {
    return {
      enabled: options?.enabled ?? DEFAULT_ENTRY_ID_OPTIONS.enabled,
      generator: options?.generator ?? DEFAULT_ENTRY_ID_OPTIONS.generator,
      store: options?.store ?? DEFAULT_ENTRY_ID_OPTIONS.store,
      maxStoredEntries: Math.max(
        1,
        options?.maxStoredEntries ?? DEFAULT_ENTRY_ID_OPTIONS.maxStoredEntries,
      ),
    };
  }
}
