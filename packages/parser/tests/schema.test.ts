import { describe, it, expect } from 'vitest';
import { Parser } from '../src/index';

describe('Parser Schema Validation', () => {
  it('should validate allowed subcommands', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('help', {
      allowedSubcommands: ['filter', 'category'],
    });

    const result = parser.parse('!help invalid');
    expect(result?.validationErrors).toContain(
      'Subcommand "invalid" is not allowed for command "help".',
    );
  });

  it('should validate required args', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('help', {
      args: {
        name: { type: 'string', required: true },
      },
    });

    const result = parser.parse('!help');
    expect(result?.validationErrors).toContain(
      'Argument "name" is required for command "help".',
    );
  });

  it('should validate arg types', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('help', {
      args: {
        count: { type: 'number' },
      },
    });

    const result = parser.parse('!help count(string)');
    expect(result?.validationErrors).toContain(
      'Argument "count" must be of type "number", but got "string".',
    );
  });

  it('should validate subcommand-specific args', () => {
    const parser = new Parser({ prefix: '!', argFormat: 'equals' });
    parser.registerSchema('info', {
      allowedSubcommands: ['general'],
      subArgs: {
        general: {
          category: { type: 'string', required: true },
        },
      },
    });

    // Should require category when subcommand is general
    const result1 = parser.parse('!info general');
    expect(result1?.validationErrors).toContain(
      'Argument "category" is required for subcommand "general" in command "info".',
    );

    // Should pass when category is provided
    const result2 = parser.parse('!info general category=general');
    expect(result2?.validationErrors).toBeUndefined();

    // Should not require category if no subcommand
    const result3 = parser.parse('!info category=general');
    expect(result3?.validationErrors).toBeUndefined();
  });

  it('should prioritize subcommand-specific args over global args', () => {
    const parser = new Parser({ prefix: '!', argFormat: 'equals' });
    parser.registerSchema('test', {
      args: {
        value: { type: 'string', required: true },
      },
      subArgs: {
        number: {
          value: { type: 'number', required: true },
        },
      },
    });

    // Global: value as string
    const result1 = parser.parse('!test value=hello');
    expect(result1?.validationErrors).toBeUndefined();

    // Subcommand: value as number (overrides global)
    const result2 = parser.parse('!test number value=123');
    expect(result2?.validationErrors).toBeUndefined();

    // Subcommand: value as string should fail
    const result3 = parser.parse('!test number value=hello');
    expect(result3?.validationErrors).toContain(
      'Argument "value" for subcommand "number" must be of type "number", but got "string".',
    );
  });

  it('should pass validation when schema matches', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('help', {
      allowedSubcommands: ['filter'],
      args: {
        name: { type: 'string', required: true },
      },
    });

    const result = parser.parse('!help filter name(test)');
    expect(result?.validationErrors).toBeUndefined();
  });

  it('should validate multiple subcommands', () => {
    const parser = new Parser({ prefix: '!', argFormat: 'equals' });
    parser.registerSchema('info', {
      allowedSubcommands: ['command', 'help'],
      subArgs: {
        command: {
          cmd: { type: 'string', required: true },
        },
        help: {
          topic: { type: 'string', required: true },
        },
      },
    });

    // Valid: both subcommands allowed, args provided
    const result1 = parser.parse('!info command help cmd=test topic=general');
    expect(result1?.validationErrors).toBeUndefined();

    // Invalid: extra subcommand not allowed
    const result2 = parser.parse(
      '!info command help invalid cmd=test topic=general',
    );
    expect(result2?.validationErrors).toContain(
      'Subcommand "invalid" is not allowed for command "info".',
    );

    // Invalid: missing arg for one subcommand
    const result3 = parser.parse('!info command help cmd=test');
    expect(result3?.validationErrors).toContain(
      'Argument "topic" is required for subcommand "help" in command "info".',
    );
  });
});

describe('Parser Last Parsed', () => {
  it('should store the last parsed command', () => {
    const parser = new Parser({ prefix: '!' });
    const result1 = parser.parse('!help');
    const last = parser.getLastParsed();
    expect(last).toEqual(result1);
  });

  it('should return null if no command parsed', () => {
    const parser = new Parser({ prefix: '!' });
    const last = parser.getLastParsed();
    expect(last).toBeNull();
  });
});
