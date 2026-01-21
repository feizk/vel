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

- `info(message: string)`: Logs an info message.
- `warn(message: string)`: Logs a warning message.
- `error(message: string)`: Logs an error message.
- `debug(message: string)`: Logs a debug message.

All messages include a timestamp and are colored accordingly.