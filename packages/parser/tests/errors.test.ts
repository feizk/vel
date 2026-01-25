import { describe, it, expect } from 'vitest';
import { Parser } from '../src/index';

describe('Parser Errors', () => {
  it('should return result with errors for invalid arg format', () => {
    const parser = new Parser({ prefix: 'v?' });
    const result = parser.parse('v?help name(general) nakedArg');
    expect(result).toEqual({
      prefixUsed: 'v?',
      command: 'help',
      subcommands: [],
      args: { name: 'general' },
      originalMessage: 'v?help name(general) nakedArg',
      errors: ['Invalid argument format: "nakedArg"'],
    });
  });

  it('should return result with errors for invalid named format', () => {
    const parser = new Parser({ prefix: 'v?', argFormat: 'named' });
    let result = parser.parse('v?help --name');
    expect(result).toEqual({
      prefixUsed: 'v?',
      command: 'help',
      subcommands: [],
      args: {},
      originalMessage: 'v?help --name',
      errors: ['Invalid named arg: "--name" at unknown'],
    });

    result = parser.parse('v?help --name general extra');
    expect(result).toEqual({
      prefixUsed: 'v?',
      command: 'help',
      subcommands: [],
      args: { name: 'general' },
      originalMessage: 'v?help --name general extra',
      errors: ['Invalid named arg: "extra" at unknown'],
    });
  });

  it('should return result with errors for invalid arg format', () => {
    const parser = new Parser({ prefix: 'v?' });
    const result = parser.parse('v?help name(general) nakedArg');
    expect(result).toEqual({
      prefixUsed: 'v?',
      command: 'help',
      subcommands: [],
      args: { name: 'general' },
      originalMessage: 'v?help name(general) nakedArg',
      errors: ['Invalid argument format: "nakedArg"'],
    });
  });
});
