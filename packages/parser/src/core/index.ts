import {
  ParserOptions,
  ParsedCommand,
  ParseError,
  Mention,
} from '../types/index';
import { Tokenizer } from './tokenizer';
import { ArgumentParser } from './argument-parser';

/**
 * Core message parser that combines tokenization and argument parsing.
 */
export class MessageParser {
  private tokenizer: Tokenizer;
  private argumentParser: ArgumentParser;
  private options: ParserOptions;

  constructor(options: ParserOptions) {
    this.options = options;
    this.tokenizer = new Tokenizer(options);
    this.argumentParser = new ArgumentParser(options, options.debug ?? false);
  }

  /**
   * Parses a message into a command structure.
   * @param message - The message to parse.
   * @returns The parsed command or null if invalid.
   */
  parse(message: string): ParsedCommand | null {
    if (this.options.debug) {
      console.log(
        '[DEBUG] MessageParser.parse Starting message parsing:',
        message,
      );
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      if (this.options.debug) {
        console.log(
          '[DEBUG] MessageParser.parse Invalid message type or empty:',
          message,
        );
      }
      return null;
    }

    // Find prefix
    const { prefixUsed, content } = this.findPrefix(message);
    if (this.options.debug) {
      console.log(
        '[DEBUG] MessageParser.findPrefix Found prefix:',
        prefixUsed,
        'content:',
        content,
      );
    }

    if (!content.trim()) {
      if (this.options.debug) {
        console.log(
          '[DEBUG] MessageParser.parse No content after prefix:',
          message,
        );
      }
      return null;
    }

    // Tokenize
    const { tokens, errors: tokenErrors } = this.tokenizer.tokenize(
      content.trim(),
    );
    if (this.options.debug) {
      console.log('[DEBUG] MessageParser.parse Tokenized:', tokens);
    }

    if (tokens.length === 0) {
      if (this.options.debug) {
        console.log('[DEBUG] MessageParser.parse No tokens after tokenization');
      }
      return null;
    }

    // Extract command and subcommands
    const { command, subcommands, argStartIndex, parseErrors } =
      this.extractCommandAndSubcommands(tokens);

    // Check case sensitivity for command
    if (this.options.caseSensitive && command !== command.toLowerCase()) {
      if (this.options.debug) {
        console.log(
          '[DEBUG] MessageParser.parse Command case mismatch:',
          command,
        );
      }
      return null;
    }

    // Parse arguments
    const { args, errors: argErrors } = this.argumentParser.parseArguments(
      tokens,
      argStartIndex,
    );

    // Extract mentions
    const mentions = this.extractMentions(tokens);

    const result: ParsedCommand = {
      prefixUsed,
      command,
      subcommands,
      args,
      originalMessage: message,
      mentions,
    };

    const allErrors = [...tokenErrors, ...parseErrors, ...argErrors];
    if (allErrors.length > 0) {
      result.errors = allErrors;
    }

    if (this.options.debug) {
      console.log(
        '[INFO] MessageParser.parse Parsing completed:',
        result.command,
      );
    }

    return result;
  }

  private findPrefix(message: string): { prefixUsed: string; content: string } {
    const prefixes = Array.isArray(this.options.prefix)
      ? this.options.prefix
      : [this.options.prefix];

    for (const prefix of prefixes) {
      const checkMessage = this.options.caseSensitive
        ? message
        : message.toLowerCase();
      const checkPrefix = this.options.caseSensitive
        ? prefix
        : prefix.toLowerCase();

      if (checkMessage.startsWith(checkPrefix)) {
        return {
          prefixUsed: prefix,
          content: message.slice(prefix.length),
        };
      }
    }

    return { prefixUsed: '', content: '' };
  }

  private extractCommandAndSubcommands(
    tokens: import('../types/index').Token[],
  ): {
    command: string;
    subcommands: string[];
    argStartIndex: number;
    parseErrors: ParseError[];
  } {
    const parseErrors: ParseError[] = [];
    const subcommands: string[] = [];
    let command = '';
    let argStartIndex = -1;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Skip mentions and separators
      if (token.type === 'mention' || token.type === 'separator') {
        continue;
      }

      // Check if it's an argument (depends on format)
      if (this.isArgumentToken(token)) {
        argStartIndex = i;
        break;
      }

      // First text token is command
      if (command === '') {
        command = token.value;
      } else {
        subcommands.push(token.value);
      }
    }

    if (command === '') {
      parseErrors.push({
        type: 'parse',
        message: 'No command found in message',
        position: 0,
      });
    }

    return { command, subcommands, argStartIndex, parseErrors };
  }

  private isArgumentToken(token: import('../types/index').Token): boolean {
    const value = token.value;
    switch (this.options.argFormat) {
      case 'typed':
        return /^\w+\(/.test(value);
      case 'equals':
        return /^\w+=/.test(value);
      case 'named':
        return value.startsWith('--');
      default:
        return /^\w+\(/.test(value);
    }
  }

  private extractMentions(tokens: import('../types/index').Token[]): Mention[] {
    const mentions: Mention[] = [];
    for (const token of tokens) {
      if (token.type === 'mention') {
        const mention = this.tokenizer.parseMention(token);
        if (mention) {
          mentions.push(mention);
        }
      }
    }
    return mentions;
  }
}
