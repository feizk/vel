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

## API

### Logger

- `info(...args: unknown[])`: Logs an info message.
- `warn(...args: unknown[])`: Logs a warning message.
- `error(...args: unknown[])`: Logs an error message.
- `debug(...args: unknown[])`: Logs a debug message.

All messages include a timestamp and are colored accordingly.
