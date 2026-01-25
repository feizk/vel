import { describe, it, expect } from 'vitest';
import { Parser } from '../src/index';

describe('Parser Constructor', () => {
  it('should create parser with minimal options', () => {
    const parser = new Parser({ prefix: '!' });
    expect(parser).toBeInstanceOf(Parser);
  });

  it('should create parser with multiple prefixes', () => {
    const parser = new Parser({ prefix: ['!', '?'] });
    expect(parser).toBeInstanceOf(Parser);
  });

  it('should create parser with all options', () => {
    const parser = new Parser({
      prefix: '!',
      caseSensitive: true,
      delimiter: ' ',
      argFormat: 'typed',
      debug: true,
      mentionParsing: true,
      mentionPrefixes: {
        user: '<@',
        role: '<@&',
        channel: '<#',
      },
    });
    expect(parser).toBeInstanceOf(Parser);
  });

  it('should throw error for empty prefix array', () => {
    expect(() => new Parser({ prefix: [] })).toThrow('Prefix must be provided');
  });

  it('should throw error for empty prefix string', () => {
    expect(() => new Parser({ prefix: '' })).toThrow('Prefix must be provided');
  });
});
