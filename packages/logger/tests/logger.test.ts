import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from 'vitest';
import { Logger, TIMESTAMP_TYPES } from '../src/index';

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: MockInstance<
    [message?: unknown, ...optionalParams: unknown[]],
    void
  >;

  beforeEach(() => {
    logger = new Logger();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    fetchMock.mockResolvedValue({} as Response);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    fetchMock.mockClear();
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

  it('should disable colors when enableColors is false', () => {
    const noColorLogger = new Logger({ enableColors: false });
    noColorLogger.info('test message');
    const callArgs = consoleSpy.mock.calls[0][0];
    expect(callArgs).toContain('[INFO]'); // Should not have ANSI codes
    expect(callArgs).not.toContain('\u001b['); // ANSI escape code
  });

  it('should use locale timestamp format', () => {
    const localeLogger = new Logger({
      formatTimestamp: (types) => [types.Locale, new Date().toLocaleString()],
    });
    localeLogger.info('test');
    const callArgs = consoleSpy.mock.calls[0][0];
    expect(callArgs).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Basic locale date check
  });

  it('should use custom timestamp function', () => {
    const customLogger = new Logger({
      formatTimestamp: () => [TIMESTAMP_TYPES.Custom, 'custom-time'],
    });
    customLogger.info('test');
    const callArgs = consoleSpy.mock.calls[0][0];
    expect(callArgs).toContain('custom-time');
  });

  it('should default to debug log level', () => {
    const defaultLogger = new Logger();
    defaultLogger.debug('debug message');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG]'),
      'debug message',
    );
  });

  it('should filter logs below the set level', () => {
    const infoLogger = new Logger({ level: 'info' });
    infoLogger.debug('debug message');
    expect(consoleSpy).not.toHaveBeenCalled();

    infoLogger.info('info message');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      'info message',
    );
  });

  it('should allow all levels when set to debug', () => {
    const debugLogger = new Logger({ level: 'debug' });
    debugLogger.debug('debug');
    debugLogger.info('info');
    debugLogger.warn('warn');
    debugLogger.error('error');
    expect(consoleSpy).toHaveBeenCalledTimes(4);
  });

  it('should filter debug and info when set to warn', () => {
    const warnLogger = new Logger({ level: 'warn' });
    warnLogger.debug('debug');
    warnLogger.info('info');
    expect(consoleSpy).not.toHaveBeenCalled();

    warnLogger.warn('warn');
    warnLogger.error('error');
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });

  it('should only log errors when set to error', () => {
    const errorLogger = new Logger({ level: 'error' });
    errorLogger.debug('debug');
    errorLogger.info('info');
    errorLogger.warn('warn');
    expect(consoleSpy).not.toHaveBeenCalled();

    errorLogger.error('error');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      'error',
    );
  });

  it('should allow changing log level dynamically', () => {
    const logger = new Logger();
    logger.setLevel('error');
    logger.debug('debug');
    expect(consoleSpy).not.toHaveBeenCalled();

    logger.setLevel('debug');
    logger.debug('debug');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG]'),
      'debug',
    );
  });
});

describe('Discord Transport', () => {
  let consoleSpy: MockInstance<
    [message?: unknown, ...optionalParams: unknown[]],
    void
  >;

  beforeEach(() => {
    vi.useFakeTimers();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    fetchMock.mockResolvedValue({} as Response);
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleSpy.mockRestore();
    fetchMock.mockClear();
  });

  it('should send to Discord when enabled and valid URL', async () => {
    const discordLogger = new Logger({
      discord: {
        enable: true,
        webhookURL: 'https://discord.com/api/webhooks/123/abc',
      },
    });
    discordLogger.info('test message');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.com/api/webhooks/123/abc',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"title":"INFO-'),
      }),
    );
  });

  it('should not send to Discord when disabled', () => {
    const discordLogger = new Logger({
      discord: {
        enable: false,
        webhookURL: 'https://discord.com/api/webhooks/123/abc',
      },
    });
    discordLogger.info('test message');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should not send to Discord when invalid URL', () => {
    const discordLogger = new Logger({
      discord: {
        enable: true,
        webhookURL: 'invalid-url',
      },
    });
    discordLogger.info('test message');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should use custom formatEmbed if provided', async () => {
    const customEmbed = { title: 'Custom', description: 'Custom desc' };
    const discordLogger = new Logger({
      discord: {
        enable: true,
        webhookURL: 'https://discord.com/api/webhooks/123/abc',
        formatEmbed: () => customEmbed,
      },
    });
    discordLogger.warn('test');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.com/api/webhooks/123/abc',
      expect.objectContaining({
        body: JSON.stringify({ embeds: [customEmbed] }),
      }),
    );
  });

  it('should handle multiple arguments in message', async () => {
    const discordLogger = new Logger({
      discord: {
        enable: true,
        webhookURL: 'https://discord.com/api/webhooks/123/abc',
      },
    });
    discordLogger.error('hello', 'world', 42);
    await vi.advanceTimersByTimeAsync(0);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.embeds[0].title).toMatch(/^ERROR-[A-Z0-9]{8}$/);
    expect(body.embeds[0].description).toBe('hello world 42');
  });

  it('should batch messages and send multiple embeds', async () => {
    vi.useFakeTimers();
    const discordLogger = new Logger({
      discord: {
        enable: true,
        webhookURL: 'https://discord.com/api/webhooks/123/abc',
        batchSize: 2,
        batchDelay: 1000,
      },
    });
    discordLogger.info('message 1');
    discordLogger.warn('message 2');
    discordLogger.error('message 3');

    // Should not have sent yet
    expect(fetchMock).not.toHaveBeenCalled();

    // Advance time to trigger batch send
    await vi.advanceTimersByTimeAsync(1);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.embeds).toHaveLength(2);

    // Advance again for next batch
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body2 = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(body2.embeds).toHaveLength(1);

    vi.useRealTimers();
  });

  it('should retry on failure with exponential backoff', async () => {
    vi.useFakeTimers();
    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    fetchMock.mockResolvedValue({} as Response);

    const discordLogger = new Logger({
      discord: {
        enable: true,
        webhookURL: 'https://discord.com/api/webhooks/123/abc',
        maxRetries: 2,
        retryDelayBase: 500,
      },
    });
    discordLogger.info('test');

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1); // First attempt fails

    await vi.advanceTimersByTimeAsync(500); // Retry delay 500ms
    expect(fetchMock).toHaveBeenCalledTimes(2); // Second attempt fails

    await vi.advanceTimersByTimeAsync(1000); // Next retry 1000ms (2^1 * 500)
    expect(fetchMock).toHaveBeenCalledTimes(3); // Third attempt succeeds

    vi.useRealTimers();
  });
});
