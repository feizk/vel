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

Customize the logger with constructor options:

```typescript
const logger = new Logger({
  enableColors: true, // Default: true
  formatTimestamp: undefined, // Custom timestamp formatter function, Default: ISO format
  formatLog: undefined, // Custom log formatter function, Default: undefined
  level: 'debug', // 'debug' | 'info' | 'warn' | 'error', Default: 'debug'
});
```

#### Examples

```typescript
// Disable colors
const noColorLogger = new Logger({ enableColors: false });

// Use locale timestamp
const localeLogger = new Logger({
  formatTimestamp: (types) => [types.Locale, new Date().toLocaleString()],
});

// Custom timestamp
const customLogger = new Logger({
  formatTimestamp: () => [TIMESTAMP_TYPES.Custom, 'custom-time'],
});

// Filter logs below info level
const infoLogger = new Logger({ level: 'info' });
infoLogger.debug('Not logged');
infoLogger.info('Logged'); // and higher

// Change level dynamically
logger.setLevel('error');
```

## API

### Logger

- `info(...args: unknown[])`: Logs an info message.
- `warn(...args: unknown[])`: Logs a warning message.
- `error(...args: unknown[])`: Logs an error message.
- `debug(...args: unknown[])`: Logs a debug message.
- `setLevel(level: LogLevel)`: Sets the minimum log level for filtering messages.

All messages include a timestamp and are colored accordingly (unless disabled via options).
