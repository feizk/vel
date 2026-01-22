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
  timestampFormat: 'iso', // 'iso' | 'locale' | custom function, Default: 'iso'
  logFormat: undefined, // Custom formatter function, Default: undefined
  logLevel: 'debug', // 'debug' | 'info' | 'warn' | 'error', Default: 'debug'
});
```

#### Examples

```typescript
// Disable colors
const noColorLogger = new Logger({ enableColors: false });

// Use locale timestamp
const localeLogger = new Logger({ timestampFormat: 'locale' });

// Filter logs below info level
const infoLogger = new Logger({ logLevel: 'info' });
infoLogger.debug('Not logged');
infoLogger.info('Logged'); // and higher

// Change level dynamically
logger.setLogLevel('error');
```

## API

### Logger

- `info(...args: unknown[])`: Logs an info message.
- `warn(...args: unknown[])`: Logs a warning message.
- `error(...args: unknown[])`: Logs an error message.
- `debug(...args: unknown[])`: Logs a debug message.
- `setLogLevel(level: LogLevel)`: Sets the minimum log level for filtering messages.

All messages include a timestamp and are colored accordingly (unless disabled via options).
