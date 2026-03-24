import type { LogLevel } from '@feizk/logger';

export type FileTransportOptions = {
  filePath: string;
  level?: LogLevel;
  format?: 'text' | 'json';
  customFormatter?: (entry: unknown) => string;
  rotation?: {
    maxSize?: string;
    maxFiles?: number;
    pattern?: string;
  };
  append?: boolean;
  bufferSize?: number;
  flushInterval?: number;
};

export const DEFAULT_FILE_TRANSPORT_OPTIONS: Required<FileTransportOptions> = {
  filePath: '',
  level: 'debug',
  format: 'text',
  customFormatter: () => '',
  rotation: {
    maxSize: '10M',
    maxFiles: 5,
    pattern: 'yyyy-MM-DD',
  },
  append: true,
  bufferSize: 1024 * 64,
  flushInterval: 1000,
};

export function parseSizeString(size: string): number {
  const match = size.match(/^(\d+(?:\.\d+)?)([KMG]?)$/i);
  if (!match) {
    return 0;
  }
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  switch (unit) {
    case 'K':
      return Math.floor(value * 1024);
    case 'M':
      return Math.floor(value * 1024 * 1024);
    case 'G':
      return Math.floor(value * 1024 * 1024 * 1024);
    default:
      return Math.floor(value);
  }
}

export function getCurrentDatePattern(pattern: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  return pattern
    .replace('yyyy', String(year))
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}
