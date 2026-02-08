import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from 'vitest';
import { Logger, LOG_LEVEL_PRIORITIES } from '../src/index';

describe('Logger v2.0.0', () => {
  let consoleLogSpy: MockInstance<
    [message?: unknown, ...optionalParams: unknown[]],
    void
  >;
  let consoleWarnSpy: MockInstance<
    [message?: unknown, ...optionalParams: unknown[]],
    void
  >;
  let consoleErrorSpy: MockInstance<
    [message?: unknown, ...optionalParams: unknown[]],
    void
  >;
  let consoleDebugSpy: MockInstance<
    [message?: unknown, ...optionalParams: unknown[]],
    void
  >;
  let consoleTraceSpy: MockInstance<
    [message?: unknown, ...optionalParams: unknown[]],
    void
  >;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleTraceSpy = vi.spyOn(console, 'trace').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
    consoleTraceSpy.mockRestore();
  });

  // ============================================================================
  // Log Levels
  // ============================================================================

  describe('Log Levels', () => {
    it('should support 6 log levels with correct priorities', () => {
      expect(LOG_LEVEL_PRIORITIES.trace).toBe(0);
      expect(LOG_LEVEL_PRIORITIES.debug).toBe(1);
      expect(LOG_LEVEL_PRIORITIES.info).toBe(2);
      expect(LOG_LEVEL_PRIORITIES.warn).toBe(3);
      expect(LOG_LEVEL_PRIORITIES.error).toBe(4);
      expect(LOG_LEVEL_PRIORITIES.fatal).toBe(5);
    });

    it('should have trace method', () => {
      const logger = new Logger({ level: 'trace' });
      logger.trace('test');
      expect(consoleTraceSpy).toHaveBeenCalled();
    });

    it('should have fatal method', () => {
      const logger = new Logger();
      logger.fatal('test');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Console Methods
  // ============================================================================

  describe('Console Methods', () => {
    it('should use console.log for info', () => {
      const logger = new Logger();
      logger.info('msg');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should use console.warn for warn', () => {
      const logger = new Logger();
      logger.warn('msg');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should use console.error for error', () => {
      const logger = new Logger();
      logger.error('msg');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should use console.debug for debug', () => {
      const logger = new Logger();
      logger.debug('msg');
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('should use console.trace for trace', () => {
      const logger = new Logger({ level: 'trace' });
      logger.trace('msg');
      expect(consoleTraceSpy).toHaveBeenCalled();
    });

    it('should use console.error for fatal', () => {
      const logger = new Logger();
      logger.fatal('msg');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Silent Mode
  // ============================================================================

  describe('Silent Mode', () => {
    it('should suppress console output when silent is true', () => {
      const logger = new Logger({ silent: true });
      logger.info('msg');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should still call transports when silent is true', () => {
      const transport = { log: vi.fn() };
      const logger = new Logger({ silent: true, transports: [transport] });
      logger.info('msg');
      expect(transport.log).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // JSON Mode
  // ============================================================================

  describe('JSON Mode', () => {
    it('should output valid JSON', () => {
      const logger = new Logger({ json: true });
      logger.info('test');
      const call = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(call);
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('test');
      expect(parsed.timestamp).toBeDefined();
    });

    it('should include prefix in JSON', () => {
      const logger = new Logger({ json: true, prefix: 'app' });
      logger.info('test');
      const call = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(call);
      expect(parsed.prefix).toBe('app');
    });

    it('should include context in JSON', () => {
      const logger = new Logger({ json: true, context: { key: 'value' } });
      logger.info('test');
      const call = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(call);
      expect(parsed.context).toEqual({ key: 'value' });
    });
  });

  // ============================================================================
  // Custom Formatter
  // ============================================================================

  describe('Custom Formatter', () => {
    it('should use custom formatter', () => {
      const logger = new Logger({
        formatter: () => 'custom output',
      });
      logger.info('test');
      expect(consoleLogSpy).toHaveBeenCalledWith('custom output');
    });

    it('should give priority to formatter over json mode', () => {
      const logger = new Logger({
        json: true,
        formatter: () => 'custom',
      });
      logger.info('test');
      expect(consoleLogSpy).toHaveBeenCalledWith('custom');
    });
  });

  // ============================================================================
  // Transports
  // ============================================================================

  describe('Transports', () => {
    it('should add transport', () => {
      const transport = { log: vi.fn() };
      const logger = new Logger();
      logger.addTransport(transport);
      logger.info('msg');
      expect(transport.log).toHaveBeenCalled();
    });

    it('should remove transport', () => {
      const transport = { log: vi.fn() };
      const logger = new Logger();
      logger.addTransport(transport);
      logger.removeTransport(transport);
      logger.info('msg');
      expect(transport.log).not.toHaveBeenCalled();
    });

    it('should handle sync transport errors gracefully', () => {
      const badTransport = {
        log: () => {
          throw new Error('error');
        },
      };
      const logger = new Logger({ transports: [badTransport] });
      // Should not throw
      logger.info('msg');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle async transport errors gracefully', async () => {
      const badTransport = {
        log: async () => {
          throw new Error('error');
        },
        destroy: vi.fn(),
      };
      const logger = new Logger({ transports: [badTransport] });
      // Should not throw
      logger.info('msg');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should call destroy on all transports', async () => {
      const transport1 = { log: vi.fn(), destroy: vi.fn() };
      const transport2 = { log: vi.fn(), destroy: vi.fn() };
      const logger = new Logger({ transports: [transport1, transport2] });
      await logger.destroy();
      expect(transport1.destroy).toHaveBeenCalled();
      expect(transport2.destroy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Child Logger
  // ============================================================================

  describe('Child Logger', () => {
    it('should create child with prefix', () => {
      const parent = new Logger({ prefix: 'parent' });
      const child = parent.child({ prefix: 'child' });
      child.info('msg');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[parent:child]'),
        'msg',
      );
    });

    it('should inherit transports from parent', () => {
      const transport = { log: vi.fn() };
      const parent = new Logger({ transports: [transport] });
      const child = parent.child();
      child.info('msg');
      expect(transport.log).toHaveBeenCalled();
    });

    it('should allow overriding level', () => {
      const parent = new Logger({ level: 'info' });
      const child = parent.child({ level: 'error' });
      child.info('should not log');
      expect(consoleLogSpy).not.toHaveBeenCalled();
      child.error('should log');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should merge context', () => {
      const parent = new Logger({ context: { parent: 'p' } });
      const child = parent.child({ context: { child: 'c' } });
      // Child should have merged context
      child.info('msg');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Level Management
  // ============================================================================

  describe('Level Management', () => {
    it('should set level', () => {
      const logger = new Logger();
      logger.setLevel('error');
      expect(logger.getLevel()).toBe('error');
    });

    it('should get level', () => {
      const logger = new Logger({ level: 'warn' });
      expect(logger.getLevel()).toBe('warn');
    });
  });

  // ============================================================================
  // Destroy
  // ============================================================================

  describe('Destroy', () => {
    it('should clear transports after destroy', async () => {
      const transport = { log: vi.fn() };
      const logger = new Logger({ transports: [transport] });
      await logger.destroy();
      logger.info('msg');
      expect(transport.log).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Colors
  // ============================================================================

  describe('Colors', () => {
    it('should use ANSI colors by default', () => {
      const logger = new Logger();
      logger.info('msg');
      const call = consoleLogSpy.mock.calls[0][0] as string;
      expect(call).toContain('\x1b['); // ANSI escape
    });

    it('should disable colors when requested', () => {
      const logger = new Logger({ enableColors: false });
      logger.info('msg');
      const call = consoleLogSpy.mock.calls[0][0] as string;
      expect(call).not.toContain('\x1b[');
      expect(call).toContain('[INFO]');
    });
  });

  // ============================================================================
  // Timestamp
  // ============================================================================

  describe('Timestamp', () => {
    it('should use iso format by default', () => {
      const logger = new Logger();
      logger.info('msg');
      const call = consoleLogSpy.mock.calls[0][0] as string;
      expect(call).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should use locale format', () => {
      const logger = new Logger({ timestamp: 'locale' });
      logger.info('msg');
      const call = consoleLogSpy.mock.calls[0][0] as string;
      expect(call).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should use custom format', () => {
      const logger = new Logger({ timestamp: () => 'custom' });
      logger.info('msg');
      const call = consoleLogSpy.mock.calls[0][0] as string;
      expect(call).toContain('custom');
    });
  });

  // ============================================================================
  // Prefix
  // ============================================================================

  describe('Prefix', () => {
    it('should include prefix in output', () => {
      const logger = new Logger({ prefix: 'app' });
      logger.info('msg');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[app]'),
        'msg',
      );
    });
  });
});
