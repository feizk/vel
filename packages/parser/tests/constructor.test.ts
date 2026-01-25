import { describe, it, expect } from 'vitest';
import { Parser } from '../src/index';

describe('Parser Constructor', () => {
  it('should throw error if no prefix provided', () => {
    expect(() => new Parser({ prefix: '' })).toThrow('Prefix must be provided');
    expect(() => new Parser({ prefix: [] })).toThrow('Prefix must be provided');
  });

  it('should throw error message if no prefix provided', () => {
    expect(
      () =>
        new Parser({
          prefix: '',
        }),
    ).toThrow('Prefix must be provided');
  });

  it('should accept debug option', () => {
    expect(() => new Parser({ prefix: '!', debug: true })).not.toThrow();
    expect(() => new Parser({ prefix: '!', debug: false })).not.toThrow();
  });
});
