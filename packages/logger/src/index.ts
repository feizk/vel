import chalk from 'chalk';

/**
 * A simple logger with colored outputs and timestamps.
 */
export class Logger {
  /**
   * Logs an info message.
   * @param message - The message to log.
   */
  info(message: string): void {
    console.log(`${chalk.blue('[INFO]')} ${this.getTimestamp()} ${message}`);
  }

  /**
   * Logs a warning message.
   * @param message - The message to log.
   */
  warn(message: string): void {
    console.log(`${chalk.yellow('[WARN]')} ${this.getTimestamp()} ${message}`);
  }

  /**
   * Logs an error message.
   * @param message - The message to log.
   */
  error(message: string): void {
    console.log(`${chalk.red('[ERROR]')} ${this.getTimestamp()} ${message}`);
  }

  /**
   * Logs a debug message.
   * @param message - The message to log.
   */
  debug(message: string): void {
    console.log(`${chalk.gray('[DEBUG]')} ${this.getTimestamp()} ${message}`);
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private removeFunction() {
    return 'Please remove this function';
  }
}
