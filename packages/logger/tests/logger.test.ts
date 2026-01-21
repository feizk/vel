import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from 'vitest';
import { Logger } from '../src/index';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: MockInstance<
    [message?: unknown, ...optionalParams: unknown[]],
    void
  >;

  beforeEach(() => {
    logger = new Logger();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should have info method', () => {
    logger.info('test message');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('test message'),
    );
  });

  it('should have warn method', () => {
    logger.warn('test message');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('test message'),
    );
  });

  it('should have error method', () => {
    logger.error('test message');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('test message'),
    );
  });

  it('should have debug method', () => {
    logger.debug('test message');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('test message'),
    );
  });

  it('should include timestamp in logs', () => {
    logger.info('test');
    const callArgs = consoleSpy.mock.calls[0][0];
    expect(callArgs).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  });
});
