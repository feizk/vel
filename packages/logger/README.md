# @feizk/logger

A simple logger package with colored outputs and timestamps.

## Installation

```bash
npm install @feizk/logger
```

## Usage

```typescript
import { Logger } from '@feizk/logger';

const logger = new Logger();

logger.info('This is an info message');
logger.warn('This is a warning');
logger.error('This is an error');
logger.debug('This is a debug message');
```

### Options

You can customize the logger by passing options to the constructor:

```typescript
const logger = new Logger({
  enableColors: true, // Default: true
  timestampFormat: 'iso', // 'iso' | 'locale' | custom function, Default: 'iso'
  logFormat: undefined, // Custom formatter function, Default: undefined
});

// Example: Disable colors
const noColorLogger = new Logger({ enableColors: false });

// Example: Use locale timestamp
const localeLogger = new Logger({ timestampFormat: 'locale' });

// Example: Custom timestamp
const customLogger = new Logger({
  timestampFormat: () => new Date().toLocaleTimeString(),
});

// Example: Custom log format
const customFormatLogger = new Logger({
  logFormat: (level, timestamp, args) =>
    `${timestamp} ${level}: ${args.join(' ')}`,
});
```

## API

### Logger

- `info(...args: unknown[])`: Logs an info message.
- `warn(...args: unknown[])`: Logs a warning message.
- `error(...args: unknown[])`: Logs an error message.
- `debug(...args: unknown[])`: Logs a debug message.

All messages include a timestamp and are colored accordingly (unless disabled via options).
