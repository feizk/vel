import chalk from 'chalk';

/**
 * A simple logger with colored outputs and timestamps.
 */
export class Logger {
  /**
   * Logs an info message.
   * @param args - The arguments to log.
   */
  info(...args: unknown[]): void {
    console.log(`${chalk.blue('[INFO]')} ${this.getTimestamp()}`, ...args);
  }

  /**
   * Logs a warning message.
   * @param args - The arguments to log.
   */
  warn(...args: unknown[]): void {
    console.log(`${chalk.yellow('[WARN]')} ${this.getTimestamp()}`, ...args);
  }

  /**
   * Logs an error message.
   * @param args - The arguments to log.
   */
  error(...args: unknown[]): void {
    console.log(`${chalk.red('[ERROR]')} ${this.getTimestamp()}`, ...args);
  }

  /**
   * Logs a debug message.
   * @param args - The arguments to log.
   */
  debug(...args: unknown[]): void {
    console.log(`${chalk.gray('[DEBUG]')} ${this.getTimestamp()}`, ...args);
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }
}
