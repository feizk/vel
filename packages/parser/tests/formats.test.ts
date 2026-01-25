import { describe, it, expect } from 'vitest';
import { Parser } from '../src/index';

describe('Parser Argument Formats', () => {
  describe('Typed Format', () => {
    const parser = new Parser({ prefix: '!', argFormat: 'typed' });

    it('should parse simple typed arguments', async () => {
      const result = await parser.parse('!test key(value)');
      expect(result?.args).toEqual({ key: 'value' });
    });

    it('should parse multiple typed arguments', async () => {
      const result = await parser.parse(
        '!test name(John) age(25) active(true)',
      );
      expect(result?.args).toEqual({
        name: 'John',
        age: 25,
        active: true,
      });
    });

    it('should handle quoted values in typed format', async () => {
      const result = await parser.parse(
        '!test message("Hello World") desc(\'Single quotes\')',
      );
      expect(result?.args).toEqual({
        message: 'Hello World',
        desc: 'Single quotes',
      });
    });

    it('should handle arrays in typed format', async () => {
      const result = await parser.parse('!test tags(a,b,c) numbers(10,20,30)');
      expect(result?.args).toEqual({
        tags: ['a', 'b', 'c'],
        numbers: [10, 20, 30],
      });
    });
  });

  describe('Equals Format', () => {
    const parser = new Parser({ prefix: '!', argFormat: 'equals' });

    it('should parse simple equals arguments', async () => {
      const result = await parser.parse('!test key=value');
      expect(result?.args).toEqual({ key: 'value' });
    });

    it('should parse multiple equals arguments', async () => {
      const result = await parser.parse('!test name=John age=25 active=true');
      expect(result?.args).toEqual({
        name: 'John',
        age: 25,
        active: true,
      });
    });

    it('should handle quoted values in equals format', async () => {
      const result = await parser.parse(
        '!test message="Hello World" desc=\'Single quotes\'',
      );
      expect(result?.args).toEqual({
        message: 'Hello World',
        desc: 'Single quotes',
      });
    });
  });

  describe('Named Format', () => {
    const parser = new Parser({ prefix: '!', argFormat: 'named' });

    it('should parse simple named arguments', async () => {
      const result = await parser.parse('!test --key value');
      expect(result?.args).toEqual({ key: 'value' });
    });

    it('should parse multiple named arguments', async () => {
      const result = await parser.parse(
        '!test --name John --age 25 --active true',
      );
      expect(result?.args).toEqual({
        name: 'John',
        age: 25,
        active: true,
      });
    });

    it('should handle quoted values in named format', async () => {
      const result = await parser.parse(
        '!test --message "Hello World" --desc \'Single quotes\'',
      );
      expect(result?.args).toEqual({
        message: 'Hello World',
        desc: 'Single quotes',
      });
    });

    it('should handle mixed argument order', async () => {
      const result = await parser.parse(
        '!test --age 25 --name John --active true',
      );
      expect(result?.args).toEqual({
        age: 25,
        name: 'John',
        active: true,
      });
    });
  });

  describe('Mixed Scenarios', () => {
    it('should handle commands with subcommands and arguments', async () => {
      const parser = new Parser({ prefix: '!' });
      const result = await parser.parse(
        '!help filter name(test) status(active)',
      );
      expect(result).toEqual({
        prefixUsed: '!',
        command: 'help',
        subcommands: ['filter'],
        args: { name: 'test', status: 'active' },
        originalMessage: '!help filter name(test) status(active)',
        mentions: [],
        resolvedCommand: undefined,
        resolvedSubcommands: undefined,
      });
    });

    it('should handle mentions with arguments', async () => {
      const parser = new Parser({ prefix: '!', mentionParsing: true });
      const result = await parser.parse('!kick <@123> reason("Bad behavior")');
      expect(result?.args).toEqual({ reason: 'Bad behavior' });
      expect(result?.mentions).toEqual([
        { type: 'user', id: '123', raw: '<@123>' },
      ]);
    });

    it('should handle complex nested structures', async () => {
      const parser = new Parser({ prefix: '!' });
      const result = await parser.parse(
        '!create embed title("My Title") desc("Description") fields(title1,value1,title2,value2)',
      );
      expect(result?.args).toEqual({
        title: 'My Title',
        desc: 'Description',
        fields: ['title1', 'value1', 'title2', 'value2'],
      });
    });
  });
});
