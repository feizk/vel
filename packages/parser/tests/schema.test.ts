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

  it('should validate string minLength and maxLength', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        name: { type: 'string', minLength: 3, maxLength: 10 },
      },
    });

    const result1 = parser.parse('!test name(ab)');
    expect(result1?.validationErrors).toContain(
      'Argument "name" must be at least 3 characters long, but got 2.',
    );

    const result2 = parser.parse('!test name(abcdefghijk)');
    expect(result2?.validationErrors).toContain(
      'Argument "name" must be at most 10 characters long, but got 11.',
    );

    const result3 = parser.parse('!test name(hello)');
    expect(result3?.validationErrors).toBeUndefined();
  });

  it('should validate string pattern', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      },
    });

    const result1 = parser.parse('!test email(invalid)');
    expect(result1?.validationErrors).toContain(
      'Argument "email" must match pattern "^[^@]+@[^@]+\\.[^@]+$", but got "invalid".',
    );

    const result2 = parser.parse('!test email(test@example.com)');
    expect(result2?.validationErrors).toBeUndefined();
  });

  it('should validate allowedValues', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        status: { type: 'string', allowedValues: ['active', 'inactive'] },
        count: { type: 'number', allowedValues: [1, 2, 3] },
      },
    });

    const result1 = parser.parse('!test status(pending)');
    expect(result1?.validationErrors).toContain(
      'Argument "status" must be one of: active,inactive, but got "pending".',
    );

    const result2 = parser.parse('!test count(5)');
    expect(result2?.validationErrors).toContain(
      'Argument "count" must be one of: 1,2,3, but got "5".',
    );

    const result3 = parser.parse('!test status(active) count(2)');
    expect(result3?.validationErrors).toBeUndefined();
  });

  it('should validate number min and max', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        age: { type: 'number', min: 0, max: 120 },
      },
    });

    const result1 = parser.parse('!test age(-5)');
    expect(result1?.validationErrors).toContain(
      'Argument "age" must be at least 0, but got -5.',
    );

    const result2 = parser.parse('!test age(150)');
    expect(result2?.validationErrors).toContain(
      'Argument "age" must be at most 120, but got 150.',
    );

    const result3 = parser.parse('!test age(25)');
    expect(result3?.validationErrors).toBeUndefined();
  });

  it('should validate array minItems and maxItems', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        tags: { type: 'array', minItems: 1, maxItems: 3 },
      },
    });

    const result1 = parser.parse('!test tags()');
    expect(result1?.validationErrors).toContain(
      'Argument "tags" must have at least 1 items, but got 0.',
    );

    const result2 = parser.parse('!test tags(a,b,c,d)');
    expect(result2?.validationErrors).toContain(
      'Argument "tags" must have at most 3 items, but got 4.',
    );

    const result3 = parser.parse('!test tags(a,b)');
    expect(result3?.validationErrors).toBeUndefined();
  });

  it('should validate date min and max', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        createdAt: {
          type: 'date',
          min: '2020-01-01T00:00:00Z',
          max: '2030-01-01T00:00:00Z',
        },
      },
    });

    const result1 = parser.parse('!test createdAt(2019-01-01T00:00:00Z)');
    expect(result1?.validationErrors).toContain(
      'Argument "createdAt" must be after 2020-01-01T00:00:00.000Z, but got 2019-01-01T00:00:00.000Z.',
    );

    const result2 = parser.parse('!test createdAt(2031-01-01T00:00:00Z)');
    expect(result2?.validationErrors).toContain(
      'Argument "createdAt" must be before 2030-01-01T00:00:00.000Z, but got 2031-01-01T00:00:00.000Z.',
    );

    const result3 = parser.parse('!test createdAt(2025-01-01T00:00:00Z)');
    expect(result3?.validationErrors).toBeUndefined();
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

  it('should validate date type arguments', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('event', {
      args: {
        startDate: { type: 'date', required: true },
      },
    });

    const result = parser.parse('!event startDate(2023-01-01T00:00:00Z)');
    expect(result?.validationErrors).toBeUndefined();
  });

  it('should validate array type arguments', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('tag', {
      args: {
        items: { type: 'array', required: true },
      },
    });

    const result = parser.parse('!tag items(a,b,c)');
    expect(result?.validationErrors).toBeUndefined();
  });

  it('should reject invalid date type', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('event', {
      args: {
        startDate: { type: 'date', required: true },
      },
    });

    const result = parser.parse('!event startDate(not-a-date)');
    expect(result?.validationErrors).toContain(
      'Argument "startDate" must be of type "date", but got "string".',
    );
  });

  it('should reject invalid array type', () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('tag', {
      args: {
        items: { type: 'array', required: true },
      },
    });

    const result = parser.parse('!tag items(not-an-array)');
    expect(result?.validationErrors).toContain(
      'Argument "items" must be of type "array", but got "string".',
    );
  });
});
