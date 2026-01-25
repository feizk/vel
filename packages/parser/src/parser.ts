import { ParserOptions, ParsedCommand, DebugOptions } from './types';
import { tokenize, coerceValue } from './utils';
import { Logger } from '@feizk/logger';

/**
 * Core message parser that handles prefix detection, tokenization, and argument parsing.
 */
export class MessageParser {
  private options: Required<Omit<ParserOptions, 'debug'>> & {
    debug?: DebugOptions;
  };
  private logger: Logger;

  /**
   * Creates an instance of MessageParser.
   * @param options - The configuration options for the parser.
   * @param logger - Logger instance to use for debug logging.
   * @throws {Error} If prefix is not provided or empty.
   */
  constructor(options: ParserOptions, logger: Logger) {
    if (
      !options.prefix ||
      (Array.isArray(options.prefix) && options.prefix.length === 0)
    ) {
      throw new Error('Prefix must be provided');
    }

    this.options = {
      prefix: options.prefix,
      caseSensitive: options.caseSensitive ?? false,
      delimiter: options.delimiter ?? ' ',
      argFormat: options.argFormat ?? 'typed',
      debug: options.debug,
    };

    this.logger = logger;
  }

  /**
   * Parses a message into a command structure.
   * @param message - The message to parse.
   * @returns The parsed command or null if invalid.
   */
  parse(message: string): ParsedCommand | null {
    this.logger.debug('MessageParser.parse Starting message parsing', message);

    if (typeof message !== 'string' || message.trim().length === 0) {
      this.logger.debug(
        'MessageParser.parse Invalid message type or empty',
        message,
      );
      return null;
    }

    const { prefixUsed, content } = this.findPrefix(message);
    this.logger.debug(
      'MessageParser.findPrefix Found prefix',
      prefixUsed,
      'content:',
      content,
    );

    if (!content.trim()) {
      this.logger.debug('MessageParser.parse No content after prefix', message);
      return null;
    }

    const parts = tokenize(content.trim(), this.options.delimiter);
    this.logger.debug('MessageParser.parse Tokenized parts', parts);

    if (parts.length === 0) {
      this.logger.debug(
        'MessageParser.parse No parts after tokenization',
        content,
      );
      return null;
    }

    const command = parts[0];
    this.logger.debug('MessageParser.parse Extracted command', command);

    const { subcommands, args, errors } = this.parseParts(parts);
    this.logger.debug(
      'MessageParser.parseParts Parsed subcommands and args',
      subcommands,
      args,
      errors,
    );

    const result: ParsedCommand = {
      prefixUsed,
      command,
      subcommands,
      args,
      originalMessage: message,
    };

    if (errors.length > 0) {
      this.logger.warn('MessageParser.parse Parsing errors found', errors);
      result.errors = errors;
    }

    this.logger.info('MessageParser.parse Parsing completed', result.command);
    return result;
  }

  /**
   * Finds the matching prefix in the message.
   * @param message - The message to check.
   * @returns Object with prefixUsed and remaining content.
   */
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

  /**
   * Parses the parts into subcommands and args.
   * @param parts - Tokenized parts of the content.
   * @returns Object with subcommands, args, and errors.
   */
  private parseParts(parts: string[]): {
    subcommands: string[];
    args: Record<string, unknown>;
    errors: string[];
  } {
    const subcommands: string[] = [];
    const args: Record<string, unknown> = {};
    const errors: string[] = [];

    let argStartIndex = -1;
    const { argRegex, isPairFormat } = this.getArgRegex();

    // Helper to check if a part is an argument
    const isArg = (part: string): boolean => argRegex.test(part);

    // Find the first arg
    for (let i = 1; i < parts.length; i++) {
      if (isArg(parts[i])) {
        argStartIndex = i;
        break;
      }
      subcommands.push(parts[i]);
    }

    // Parse args
    if (argStartIndex !== -1) {
      this.parseArgs(
        parts.slice(argStartIndex).join(this.options.delimiter),
        argRegex,
        isPairFormat,
        args,
        errors,
      );
    }

    return { subcommands, args, errors };
  }

  /**
   * Gets the regex and format type for arguments based on argFormat.
   * @returns Object with argRegex and isPairFormat.
   */
  private getArgRegex(): { argRegex: RegExp; isPairFormat: boolean } {
    let argRegex: RegExp;
    let isPairFormat = false;

    switch (this.options.argFormat) {
      case 'typed':
        argRegex = /^(\w+)\(\s*("[^"]*"|[^)\s]*)\s*\)/;
        break;
      case 'equals':
        argRegex = /^(\w+)\s*=\s*("[^"]*"|[^"\s]*)/;
        break;
      case 'named':
        isPairFormat = true;
        argRegex = /^--(\w+)/;
        break;
      default:
        argRegex = /^(\w+)\(\s*("[^"]*"|[^)\s]*)\s*\)/;
    }

    return { argRegex, isPairFormat };
  }

  /**
   * Parses the arguments from the remaining content.
   * @param argsContent - The content containing arguments.
   * @param argRegex - Regex for matching arguments.
   * @param isPairFormat - Whether it's a pair format (named).
   * @param args - Object to store parsed args.
   * @param errors - Array to store errors.
   */
  private parseArgs(
    argsContent: string,
    argRegex: RegExp,
    isPairFormat: boolean,
    args: Record<string, unknown>,
    errors: string[],
  ): void {
    let remaining = argsContent;

    if (isPairFormat) {
      this.parseNamedArgs(remaining, argRegex, args, errors);
    } else {
      this.parseTypedOrEqualsArgs(remaining, argRegex, args, errors);
    }
  }

  /**
   * Parses named arguments (--key value).
   * @param remaining - Remaining content to parse.
   * @param argRegex - Regex for keys.
   * @param args - Object to store args.
   * @param errors - Array to store errors.
   */
  private parseNamedArgs(
    remaining: string,
    argRegex: RegExp,
    args: Record<string, unknown>,
    errors: string[],
  ): void {
    while (remaining.trim()) {
      const keyMatch = remaining.match(argRegex);
      if (!keyMatch) {
        errors.push(
          `Invalid named arg: "${remaining.split(' ')[0]}" at unknown`,
        );
        break;
      }
      const key = keyMatch[1];
      remaining = remaining.slice(keyMatch[0].length).trim();

      if (!remaining) {
        errors.push(`Invalid named arg: "${keyMatch[0]}" at unknown`);
        break;
      }

      // Parse value
      let value: string;
      if (remaining.startsWith('"')) {
        const endQuote = remaining.indexOf('"', 1);
        if (endQuote === -1) {
          errors.push(`Invalid named arg: "${remaining}" at unknown`);
          break;
        }
        value = remaining.slice(1, endQuote);
        remaining = remaining.slice(endQuote + 1).trim();
      } else {
        const spaceIndex = remaining.indexOf(this.options.delimiter);
        if (spaceIndex === -1) {
          value = remaining;
          remaining = '';
        } else {
          value = remaining.slice(0, spaceIndex);
          remaining = remaining
            .slice(spaceIndex + this.options.delimiter.length)
            .trim();
        }
      }
      args[key] = coerceValue(value);
    }
  }

  /**
   * Parses typed or equals arguments.
   * @param remaining - Remaining content to parse.
   * @param argRegex - Regex for args.
   * @param args - Object to store args.
   * @param errors - Array to store errors.
   */
  private parseTypedOrEqualsArgs(
    remaining: string,
    argRegex: RegExp,
    args: Record<string, unknown>,
    errors: string[],
  ): void {
    while (remaining.trim()) {
      const match = remaining.match(argRegex);
      if (match) {
        const key = match[1];
        let value = match[2];
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        args[key] = coerceValue(value);
        remaining = remaining.slice(match[0].length).trim();
      } else {
        errors.push(
          `Invalid argument format: "${remaining.split(this.options.delimiter)[0]}"`,
        );
        break;
      }
    }
  }
}
