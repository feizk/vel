import { describe, it, expect } from 'vitest';
import { Parser } from '../src/index';

describe('Parser Parsing', () => {
  it('should parse message with prefix and command', async () => {
    const parser = new Parser({ prefix: '!' });
    const result = await parser.parse('!help');
    expect(result).toEqual({
      prefixUsed: '!',
      command: 'help',
      subcommands: [],
      args: {},
      originalMessage: '!help',
      mentions: [],
      resolvedCommand: undefined,
      resolvedSubcommands: undefined,
    });
  });

  it('should parse message with prefix, command, and subcommands', async () => {
    const parser = new Parser({ prefix: '!' });
    const result = await parser.parse('!help filter category');
    expect(result).toEqual({
      prefixUsed: '!',
      command: 'help',
      subcommands: ['filter', 'category'],
      args: {},
      originalMessage: '!help filter category',
      mentions: [],
      resolvedCommand: undefined,
      resolvedSubcommands: undefined,
    });
  });

  it('should parse message with typed arguments', async () => {
    const parser = new Parser({ prefix: '!' });
    const result = await parser.parse('!help name(test) status(active)');
    expect(result).toEqual({
      prefixUsed: '!',
      command: 'help',
      subcommands: [],
      args: { name: 'test', status: 'active' },
      originalMessage: '!help name(test) status(active)',
      mentions: [],
      resolvedCommand: undefined,
      resolvedSubcommands: undefined,
    });
  });

  it('should parse message with equals arguments', async () => {
    const parser = new Parser({ prefix: '!', argFormat: 'equals' });
    const result = await parser.parse('!help name=test status=active');
    expect(result).toEqual({
      prefixUsed: '!',
      command: 'help',
      subcommands: [],
      args: { name: 'test', status: 'active' },
      originalMessage: '!help name=test status=active',
      mentions: [],
      resolvedCommand: undefined,
      resolvedSubcommands: undefined,
    });
  });

  it('should parse message with named arguments', async () => {
    const parser = new Parser({ prefix: '!', argFormat: 'named' });
    const result = await parser.parse('!help --name test --status active');
    expect(result).toEqual({
      prefixUsed: '!',
      command: 'help',
      subcommands: [],
      args: { name: 'test', status: 'active' },
      originalMessage: '!help --name test --status active',
      mentions: [],
      resolvedCommand: undefined,
      resolvedSubcommands: undefined,
    });
  });

  it('should parse Discord mentions', async () => {
    const parser = new Parser({ prefix: '!', mentionParsing: true });
    const result = await parser.parse('!help <@123> <#456>');
    expect(result?.mentions).toEqual([
      { type: 'user', id: '123', raw: '<@123>' },
      { type: 'channel', id: '456', raw: '<#456>' },
    ]);
  });

  it('should coerce values correctly', async () => {
    const parser = new Parser({ prefix: '!' });
    const result = await parser.parse(
      '!test num(42) flag(true) date(2023-01-01T00:00:00Z) list(a,b,c)',
    );
    expect(result?.args).toEqual({
      num: 42,
      flag: true,
      date: new Date('2023-01-01T00:00:00Z'),
      list: ['a', 'b', 'c'],
    });
  });

  it('should handle quoted strings', async () => {
    const parser = new Parser({ prefix: '!' });
    const result = await parser.parse(
      '!test name("hello world") desc(\'single quotes\')',
    );
    expect(result?.args).toEqual({
      name: 'hello world',
      desc: 'single quotes',
    });
  });

  it('should return null for invalid messages', async () => {
    const parser = new Parser({ prefix: '!' });
    const result = await parser.parse('hello world');
    expect(result).toBeNull();
  });

  it('should handle multiple prefixes', async () => {
    const parser = new Parser({ prefix: ['!', '?'] });
    let result = await parser.parse('!help');
    expect(result?.prefixUsed).toBe('!');

    result = await parser.parse('?help');
    expect(result?.prefixUsed).toBe('?');
  });

  it('should be case sensitive when configured', async () => {
    const parser = new Parser({ prefix: '!', caseSensitive: true });
    let result = await parser.parse('!help');
    expect(result?.command).toBe('help');

    result = await parser.parse('!HELP');
    expect(result).toBeNull();
  });
});
