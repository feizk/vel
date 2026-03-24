import {
  createWriteStream,
  existsSync,
  mkdirSync,
  statSync,
  renameSync,
} from 'fs';
import { dirname, basename } from 'path';
import type { Transport, LogEntry, LogLevel } from '@feizk/logger';
import { LOG_LEVEL_PRIORITIES } from '@feizk/logger';
import {
  type FileTransportOptions,
  parseSizeString,
  getCurrentDatePattern,
  DEFAULT_FILE_TRANSPORT_OPTIONS,
} from './types';

export class FileTransport implements Transport {
  private readonly options: Required<FileTransportOptions>;
  private readonly buffer: string[] = [];
  private stream: ReturnType<typeof createWriteStream> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private currentFilePath: string;
  private currentDatePattern: string;
  private bytesWritten = 0;

  constructor(options: FileTransportOptions) {
    if (!options.filePath) {
      throw new Error('FileTransport requires a filePath option');
    }

    this.options = {
      ...DEFAULT_FILE_TRANSPORT_OPTIONS,
      ...options,
      rotation: {
        ...DEFAULT_FILE_TRANSPORT_OPTIONS.rotation,
        ...options.rotation,
      },
    };

    this.currentFilePath = this.options.filePath;
    this.currentDatePattern = getCurrentDatePattern(
      this.options.rotation.pattern ?? 'yyyy-MM-DD',
    );

    this.ensureDirectoryExists(dirname(this.currentFilePath));
    this.initStream();
    this.startFlushTimer();
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  private initStream(): void {
    if (this.stream) {
      this.stream.end();
    }

    this.stream = createWriteStream(this.currentFilePath, {
      flags: this.options.append ? 'a' : 'w',
      encoding: 'utf8',
    });

    this.stream.on('error', (err) => {
      console.error('[FileTransport] Stream error:', err.message);
    });

    try {
      if (existsSync(this.currentFilePath)) {
        const stats = statSync(this.currentFilePath);
        this.bytesWritten = stats.size;
      } else {
        this.bytesWritten = 0;
      }
    } catch {
      this.bytesWritten = 0;
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.options.flushInterval);
  }

  private formatEntry(entry: LogEntry): string {
    if (this.options.customFormatter) {
      return this.options.customFormatter(entry);
    }

    if (this.options.format === 'json') {
      return JSON.stringify({
        level: entry.level,
        timestamp: entry.timestamp,
        message: entry.args
          .map((arg) =>
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg),
          )
          .join(' '),
        prefix: entry.prefix,
        context: entry.context,
      });
    }

    const level = entry.level.toUpperCase().padEnd(5);
    const prefix = entry.prefix ? `[${entry.prefix}] ` : '';
    const message = entry.args
      .map((arg) =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg),
      )
      .join(' ');

    return `[${entry.timestamp}] ${level} ${prefix}${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return (
      LOG_LEVEL_PRIORITIES[level] >= LOG_LEVEL_PRIORITIES[this.options.level]
    );
  }

  private checkRotation(): void {
    if (!this.options.rotation.maxSize) {
      return;
    }

    const maxBytes = parseSizeString(this.options.rotation.maxSize);
    if (maxBytes > 0 && this.bytesWritten >= maxBytes) {
      this.rotateFile();
    }
  }

  private checkDateRotation(): void {
    if (!this.options.rotation.pattern) {
      return;
    }

    const newPattern = getCurrentDatePattern(this.options.rotation.pattern);
    if (newPattern !== this.currentDatePattern) {
      this.rotateFileByDate(newPattern);
    }
  }

  private rotateFile(): void {
    if (!this.options.rotation.maxFiles || !this.stream) {
      return;
    }

    this.flushBuffer();

    for (let i = this.options.rotation.maxFiles - 1; i > 0; i--) {
      const oldPath = this.currentFilePath + '.' + i;
      if (existsSync(oldPath)) {
        const newPath = this.currentFilePath + '.' + (i + 1);
        try {
          renameSync(oldPath, newPath);
        } catch {
          // Ignore rename errors
        }
      }
    }

    const rotatedPath = this.currentFilePath + '.1';
    try {
      renameSync(this.currentFilePath, rotatedPath);
    } catch {
      // Ignore rename errors
    }

    this.bytesWritten = 0;
    this.initStream();
  }

  private rotateFileByDate(newPattern: string): void {
    this.flushBuffer();

    const dir = dirname(this.currentFilePath);
    const ext = '.log';
    const base = basename(this.currentFilePath, ext);

    const timestampedPath = `${dir}/${base}-${this.currentDatePattern}${ext}`;
    try {
      if (existsSync(this.currentFilePath) && !existsSync(timestampedPath)) {
        renameSync(this.currentFilePath, timestampedPath);
      }
    } catch {
      // Ignore rename errors
    }

    this.currentDatePattern = newPattern;
    this.bytesWritten = 0;
    this.initStream();
  }

  log(entry: LogEntry): void | Promise<void> {
    if (this.destroyed) {
      return;
    }

    if (!this.shouldLog(entry.level)) {
      return;
    }

    this.checkRotation();
    this.checkDateRotation();

    const formatted = this.formatEntry(entry);
    this.buffer.push(formatted);
    this.bytesWritten += Buffer.byteLength(formatted, 'utf8') + 1;

    if (this.buffer.length >= this.options.bufferSize / 100) {
      this.flushBuffer();
    }
  }

  private flushBuffer(): void {
    if (this.buffer.length === 0 || !this.stream) {
      return;
    }

    const data = this.buffer.join('\n') + '\n';
    this.buffer.length = 0;

    const canWrite = this.stream.write(data);
    if (!canWrite) {
      this.stream.once('drain', () => {
        // Drain handled
      });
    }
  }

  async destroy(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.flushBuffer();

    if (this.stream) {
      await new Promise<void>((resolve) => {
        this.stream!.end(() => {
          resolve();
        });
      });
      this.stream = null;
    }
  }
}
