import { describe, it, expect } from 'vitest';
import { Parser } from '../src/index';

describe('Parser Constructor', () => {
  it('should throw error if no prefix provided', () => {
    expect(() => new Parser({ prefix: '' })).toThrow('Prefix must be provided');
    expect(() => new Parser({ prefix: [] })).toThrow('Prefix must be provided');
  });

  it('should throw custom error message if no prefix provided', () => {
    expect(
      () =>
        new Parser({
          prefix: '',
          errorMessages: { prefixRequired: 'Custom prefix error' },
        }),
    ).toThrow('Custom prefix error');
  });
});
