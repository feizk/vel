import { describe, it, expect } from 'vitest';
import { Parser } from '../src/index';

describe('Parser Schema Validation', () => {
  it('should validate required arguments', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        name: { type: 'string', required: true },
      },
    });

    const result = await parser.parse('!test');
    expect(result?.validationErrors).toContain(
      'Argument "name" is required for command "test".',
    );
  });

  it('should validate argument types', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        count: { type: 'number' },
      },
    });

    const result = await parser.parse('!test count(notanumber)');
    expect(result?.validationErrors).toContain(
      'Argument "count" must be of type "number", but got "string".',
    );
  });

  it('should validate string constraints', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        name: { type: 'string', minLength: 3, maxLength: 10 },
      },
    });

    let result = await parser.parse('!test name(ab)');
    expect(result?.validationErrors).toContain(
      'Argument "name" must be at least 3 characters long, but got 2.',
    );

    result = await parser.parse('!test name(veryverylongname)');
    expect(result?.validationErrors).toContain(
      'Argument "name" must be at most 10 characters long, but got 16.',
    );
  });

  it('should validate number constraints', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        age: { type: 'number', min: 0, max: 120 },
      },
    });

    let result = await parser.parse('!test age(-5)');
    expect(result?.validationErrors).toContain(
      'Argument "age" must be at least 0, but got -5.',
    );

    result = await parser.parse('!test age(150)');
    expect(result?.validationErrors).toContain(
      'Argument "age" must be at most 120, but got 150.',
    );
  });

  it('should validate allowed values', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        status: { type: 'string', allowedValues: ['active', 'inactive'] },
      },
    });

    const result = await parser.parse('!test status(pending)');
    expect(result?.validationErrors).toContain(
      'Argument "status" must be one of: active,inactive, but got "pending".',
    );
  });

  it('should validate subcommands', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('help', {
      allowedSubcommands: ['filter', 'search'],
    });

    const result = await parser.parse('!help invalid');
    expect(result?.validationErrors).toContain(
      'Subcommand "invalid" is not allowed for command "help".',
    );
  });

  it('should validate subcommand-specific arguments', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('help', {
      subArgs: {
        filter: {
          query: { type: 'string', required: true },
        },
      },
    });

    const result = await parser.parse('!help filter');
    expect(result?.validationErrors).toContain(
      'Argument "query" for subcommand "filter" is required for command "help".',
    );
  });

  it('should handle command aliases', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('help', {
      aliases: ['h', 'assist'],
      args: {
        topic: { type: 'string', required: true },
      },
    });

    const result = await parser.parse('!h topic(general)');
    expect(result?.command).toBe('help');
    expect(result?.resolvedCommand).toBe('h');
    expect(result?.args.topic).toBe('general');
  });

  it('should handle subcommand aliases', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('help', {
      subAliases: {
        filter: ['f', 'find'],
      },
      subArgs: {
        filter: {
          query: { type: 'string', required: true },
        },
      },
    });

    const result = await parser.parse('!help f query(test)');
    expect(result?.subcommands).toEqual(['filter']);
    expect(result?.resolvedSubcommands).toEqual(['f']);
  });

  it('should validate custom types with validators', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        email: {
          type: 'custom',
          customValidator: (value) =>
            typeof value === 'string' && value.includes('@'),
          customErrorMessage: 'Must be a valid email',
        },
      },
    });

    const result = await parser.parse('!test email(invalid)');
    expect(result?.validationErrors).toContain('Must be a valid email');
  });

  it('should handle async custom validators', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        value: {
          type: 'custom',
          customValidator: async (value) => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            return value === 'valid';
          },
        },
      },
    });

    const result = await parser.parse('!test value(invalid)');
    expect(result?.validationErrors).toContain(
      'Argument "value" failed custom validation.',
    );
  });

  it('should validate array element patterns', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        emails: { type: 'array', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      },
    });

    let result = await parser.parse('!test emails(a@b.com,invalid,x@y.z)');
    expect(result?.validationErrors).toContain(
      'Argument "emails" element at index 1 must match pattern "^[^@]+@[^@]+\\.[^@]+$", but got "invalid".',
    );

    result = await parser.parse('!test emails(a@b.com,c@d.e)');
    expect(result?.validationErrors).toBeUndefined();
  });

  it('should validate array element types', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        numbers: { type: 'array', itemType: 'number' },
      },
    });

    let result = await parser.parse('!test numbers(1,2,three)');
    expect(result?.validationErrors).toContain(
      'Argument "numbers" element at index 2 must be of type "number", but got "string".',
    );

    result = await parser.parse('!test numbers(1,2,3)');
    expect(result?.validationErrors).toBeUndefined();

    // Single value should be treated as single-element array for validation
    result = await parser.parse('!test numbers(42)');
    expect(result?.validationErrors).toBeUndefined();
  });
});
