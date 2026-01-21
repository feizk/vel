import { describe, it, expect } from 'vitest';
import { Parser } from '../src/index';

describe('Parser Parsing', () => {
  it('should parse message with prefix and command', () => {
    const parser = new Parser({ prefix: 'v?' });
    const result = parser.parse('v?help');
    expect(result).toEqual({
      prefixUsed: 'v?',
      command: 'help',
      subcommands: [],
      args: {},
      originalMessage: 'v?help',
    });
  });

  it('should parse message with prefix, command, and subcommands', () => {
    const parser = new Parser({ prefix: 'v?' });
    const result = parser.parse('v?help filter category');
    expect(result).toEqual({
      prefixUsed: 'v?',
      command: 'help',
      subcommands: ['filter', 'category'],
      args: {},
      originalMessage: 'v?help filter category',
    });
  });

  it('should parse message with prefix, command, subcommands, and typed args', () => {
    const parser = new Parser({ prefix: 'v?' });
    const result = parser.parse('v?help filter category name(general)');
    expect(result).toEqual({
      prefixUsed: 'v?',
      command: 'help',
      subcommands: ['filter', 'category'],
      args: { name: 'general' },
      originalMessage: 'v?help filter category name(general)',
    });
  });

  it('should return null if message does not start with prefix', () => {
    const parser = new Parser({ prefix: 'v?' });
    const result = parser.parse('help info');
    expect(result).toBeNull();
  });

  it('should handle case insensitive prefix', () => {
    const parser = new Parser({ prefix: 'v?', caseSensitive: false });
    const result = parser.parse('V?help');
    expect(result?.command).toBe('help');
  });

  it('should handle case sensitive prefix', () => {
    const parser = new Parser({ prefix: 'v?', caseSensitive: true });
    expect(parser.parse('V?help')).toBeNull();
    expect(parser.parse('v?help')).not.toBeNull();
  });

  it('should handle multiple prefixes', () => {
    const parser = new Parser({ prefix: ['v?', '!'] });
    expect(parser.parse('v?help')?.prefixUsed).toBe('v?');
    expect(parser.parse('!help')?.prefixUsed).toBe('!');
  });

  it('should return null for empty message', () => {
    const parser = new Parser({ prefix: 'v?' });
    expect(parser.parse('')).toBeNull();
    expect(parser.parse('   ')).toBeNull();
  });

  it('should return null for message with only prefix', () => {
    const parser = new Parser({ prefix: 'v?' });
    expect(parser.parse('v?')).toBeNull();
    expect(parser.parse('v?   ')).toBeNull();
  });

  it('should handle custom delimiter', () => {
    const parser = new Parser({ prefix: 'v?', delimiter: ',' });
    const result = parser.parse('v?help,filter,category,name(general)');
    expect(result).toEqual({
      prefixUsed: 'v?',
      command: 'help',
      subcommands: ['filter', 'category'],
      args: { name: 'general' },
      originalMessage: 'v?help,filter,category,name(general)',
    });
  });

  it('should coerce number values', () => {
    const parser = new Parser({ prefix: '!' });
    const result = parser.parse('!help count(5) rate(3.14)');
    expect(result).toEqual({
      prefixUsed: '!',
      command: 'help',
      subcommands: [],
      args: { count: 5, rate: 3.14 },
      originalMessage: '!help count(5) rate(3.14)',
    });
  });

  it('should coerce boolean values', () => {
    const parser = new Parser({ prefix: '!' });
    const result = parser.parse('!help enabled(true) disabled(false)');
    expect(result).toEqual({
      prefixUsed: '!',
      command: 'help',
      subcommands: [],
      args: { enabled: true, disabled: false },
      originalMessage: '!help enabled(true) disabled(false)',
    });
  });

  it('should keep string values as strings', () => {
    const parser = new Parser({ prefix: '!' });
    const result = parser.parse('!help name(John) status(active)');
    expect(result).toEqual({
      prefixUsed: '!',
      command: 'help',
      subcommands: [],
      args: { name: 'John', status: 'active' },
      originalMessage: '!help name(John) status(active)',
    });
  });

  it('should coerce with equals format', () => {
    const parser = new Parser({ prefix: '!', argFormat: 'equals' });
    const result = parser.parse('!help count=5 enabled=true name=John');
    expect(result).toEqual({
      prefixUsed: '!',
      command: 'help',
      subcommands: [],
      args: { count: 5, enabled: true, name: 'John' },
      originalMessage: '!help count=5 enabled=true name=John',
    });
  });

  it('should coerce with named format', () => {
    const parser = new Parser({ prefix: '!', argFormat: 'named' });
    const result = parser.parse('!help --count 5 --enabled true --name John');
    expect(result).toEqual({
      prefixUsed: '!',
      command: 'help',
      subcommands: [],
      args: { count: 5, enabled: true, name: 'John' },
      originalMessage: '!help --count 5 --enabled true --name John',
    });
  });

  it('should parse quoted arguments with spaces in typed format', () => {
    const parser = new Parser({ prefix: '!' });
    const result = parser.parse('!help name("hello world") count(5)');
    expect(result).toEqual({
      prefixUsed: '!',
      command: 'help',
      subcommands: [],
      args: { name: 'hello world', count: 5 },
      originalMessage: '!help name("hello world") count(5)',
    });
  });

  it('should parse quoted arguments with spaces in equals format', () => {
    const parser = new Parser({ prefix: '!', argFormat: 'equals' });
    const result = parser.parse('!help name="hello world" count=5');
    expect(result).toEqual({
      prefixUsed: '!',
      command: 'help',
      subcommands: [],
      args: { name: 'hello world', count: 5 },
      originalMessage: '!help name="hello world" count=5',
    });
  });

  it('should parse quoted arguments with spaces in named format', () => {
    const parser = new Parser({ prefix: '!', argFormat: 'named' });
    const result = parser.parse('!help --name "hello world" --count 5');
    expect(result).toEqual({
      prefixUsed: '!',
      command: 'help',
      subcommands: [],
      args: { name: 'hello world', count: 5 },
      originalMessage: '!help --name "hello world" --count 5',
    });
  });
});
