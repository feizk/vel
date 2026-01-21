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
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      'test message',
    );
  });

  it('should have warn method', () => {
    logger.warn('test message');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WARN]'),
      'test message',
    );
  });

  it('should have error method', () => {
    logger.error('test message');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      'test message',
    );
  });

  it('should have debug method', () => {
    logger.debug('test message');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG]'),
      'test message',
    );
  });

  it('should include timestamp in logs', () => {
    logger.info('test');
    const callArgs = consoleSpy.mock.calls[0][0];
    expect(callArgs).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  });

  it('should handle multiple arguments', () => {
    logger.info('hello', 'world', 42, { key: 'value' });
    const calls = consoleSpy.mock.calls[0];
    expect(calls[0]).toMatch(/\[INFO\]/);
    expect(calls[1]).toBe('hello');
    expect(calls[2]).toBe('world');
    expect(calls[3]).toBe(42);
    expect(calls[4]).toEqual({ key: 'value' });
  });
});
