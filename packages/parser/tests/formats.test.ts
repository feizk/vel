import { describe, it, expect } from 'vitest';
import { Parser } from '../src/index';

describe('Parser Formats', () => {
  it('should parse with equals format', () => {
    const parser = new Parser({ prefix: 'v?', argFormat: 'equals' });
    const result = parser.parse(
      'v?help filter category name=general status=active',
    );
    expect(result).toEqual({
      prefixUsed: 'v?',
      command: 'help',
      subcommands: ['filter', 'category'],
      args: { name: 'general', status: 'active' },
      originalMessage: 'v?help filter category name=general status=active',
    });
  });

  it('should parse with named format', () => {
    const parser = new Parser({ prefix: 'v?', argFormat: 'named' });
    const result = parser.parse(
      'v?help filter category --name general --status active',
    );
    expect(result).toEqual({
      prefixUsed: 'v?',
      command: 'help',
      subcommands: ['filter', 'category'],
      args: { name: 'general', status: 'active' },
      originalMessage: 'v?help filter category --name general --status active',
    });
  });
});
