import { describe, it, expect } from 'vitest';
import { Parser } from '../src/index';

describe('Parser Error Handling', () => {
  it('should handle unclosed quotes', async () => {
    const parser = new Parser({ prefix: '!' });
    const result = await parser.parse('!test name("unclosed)');
    expect(result?.errors).toContainEqual({
      type: 'parse',
      message: 'Unclosed double quote',
      position: 5,
      suggestion: 'Close the quote with "',
    });
  });

  it('should handle invalid argument formats', async () => {
    const parser = new Parser({ prefix: '!' });
    const result = await parser.parse('!test key(');
    expect(
      result?.errors?.some((e) =>
        e.message.includes('Invalid typed argument format'),
      ),
    ).toBe(true);
  });

  it('should handle missing values in named arguments', async () => {
    const parser = new Parser({ prefix: '!', argFormat: 'named' });
    const result = await parser.parse('!test --name');
    expect(result?.errors).toContainEqual({
      type: 'parse',
      message: 'Named argument "name" missing value',
      position: 5,
      suggestion: 'Provide a value after --key',
    });
  });

  it('should handle validation errors gracefully', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        required: { type: 'string', required: true },
      },
    });

    const result = await parser.parse('!test optional(value)');
    expect(result?.validationErrors).toContain(
      'Argument "required" is required for command "test".',
    );
    expect(result?.args.optional).toBe('value'); // Should still parse valid args
  });

  it('should continue parsing after errors', async () => {
    const parser = new Parser({ prefix: '!' });
    const result = await parser.parse('!test valid(arg1) invalid(arg2');
    expect(result?.args.valid).toBe('arg1');
    expect(result?.errors?.length).toBeGreaterThan(0);
  });

  it('should handle empty messages', async () => {
    const parser = new Parser({ prefix: '!' });
    const result = await parser.parse('');
    expect(result).toBeNull();
  });

  it('should handle messages with only prefix', async () => {
    const parser = new Parser({ prefix: '!' });
    const result = await parser.parse('!');
    expect(result).toBeNull();
  });

  it('should handle invalid custom validator errors', async () => {
    const parser = new Parser({ prefix: '!' });
    parser.registerSchema('test', {
      args: {
        value: {
          type: 'custom',
          customValidator: () => {
            throw new Error('Validator crashed');
          },
        },
      },
    });

    const result = await parser.parse('!test value(test)');
    expect(result?.validationErrors).toContain(
      'Argument "value" custom validation error: Validator crashed',
    );
  });
});
