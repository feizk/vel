import { ParserOptions, ParsedCommand } from './types';

/**
 * A parser for messages with configurable prefixes, delimiters, and argument formats.
 */
export class Parser {
  private options: Required<Omit<ParserOptions, 'errorMessages'>> & {
    errorMessages: {
      prefixRequired: string;
      invalidArgFormat: string;
      invalidNamedArg: string;
    };
  };

  /**
   * Coerces a string value to its appropriate type (number, boolean, or string).
   * @param value - The string value to coerce.
   * @returns The coerced value.
   */
  private coerceValue(value: string): string | number | boolean {
    if (value === 'true') return true;
    if (value === 'false') return false;
    const num = parseFloat(value);
    if (!isNaN(num) && num.toString() === value) return num;
    return value;
  }

  /**
   * Creates an instance of Parser.
   * @param {ParserOptions} options - The configuration options for the parser.
   * @throws {Error} If prefix is not provided or empty.
   */
  constructor(options: ParserOptions) {
    const errorMessages = {
      prefixRequired:
        options.errorMessages?.prefixRequired ?? 'Prefix must be provided',
      invalidArgFormat:
        options.errorMessages?.invalidArgFormat ??
        'Invalid argument format: "{part}"',
      invalidNamedArg:
        options.errorMessages?.invalidNamedArg ??
        'Invalid named arg: "{part}" at {index}',
    };

    if (
      !options.prefix ||
      (Array.isArray(options.prefix) && options.prefix.length === 0)
    ) {
      throw new Error(errorMessages.prefixRequired);
    }

    this.options = {
      prefix: options.prefix,
      caseSensitive: options.caseSensitive ?? false,
      delimiter: options.delimiter ?? ' ',
      argFormat: options.argFormat ?? 'typed',
      errorMessages,
    };
  }

  /**
   * Parses a message into a command structure.
   * @param {string} message - The message to parse.
   * @returns {ParsedCommand | null} The parsed command or null if the message is invalid or does not match any prefix.
   */
  parse(message: string): ParsedCommand | null {
    if (typeof message !== 'string' || message.trim().length === 0) {
      return null;
    }

    const prefixes = Array.isArray(this.options.prefix)
      ? this.options.prefix
      : [this.options.prefix];
    let prefixUsed = '';
    let content = '';

    for (const prefix of prefixes) {
      const checkMessage = this.options.caseSensitive
        ? message
        : message.toLowerCase();
      const checkPrefix = this.options.caseSensitive
        ? prefix
        : prefix.toLowerCase();

      if (checkMessage.startsWith(checkPrefix)) {
        prefixUsed = prefix;
        content = message.slice(prefix.length);
        break;
      }
    }

    if (!content.trim()) {
      return null;
    }

    content = content.trim();
    const parts = content
      .split(this.options.delimiter)
      .filter((p) => p.length > 0);

    if (parts.length === 0) {
      return null;
    }

    const command = parts[0];
    const subcommands: string[] = [];
    const args: Record<string, unknown> = {};
    const errors: string[] = [];

    let argStartIndex = -1;
    let argRegex: RegExp;
    let isPairFormat = false;

    switch (this.options.argFormat) {
      case 'typed':
        argRegex = /^(\w+)\(([^)]+)\)$/;
        break;
      case 'equals':
        argRegex = /^(\w+)=(.+)$/;
        break;
      case 'named':
        isPairFormat = true;
        argRegex = /^--(\w+)$/;
        break;
      default:
        argRegex = /^(\w+)\(([^)]+)\)$/;
    }

    // Find the first arg
    for (let i = 1; i < parts.length; i++) {
      if (isPairFormat) {
        if (parts[i].match(argRegex)) {
          argStartIndex = i;
          break;
        }
      } else {
        if (parts[i].match(argRegex)) {
          argStartIndex = i;
          break;
        }
      }
      subcommands.push(parts[i]);
    }

    // Parse args
    if (argStartIndex !== -1) {
      if (isPairFormat) {
        // Named: --key value pairs
        for (let i = argStartIndex; i < parts.length; i += 2) {
          const keyMatch = parts[i].match(argRegex);
          if (keyMatch && i + 1 < parts.length) {
            const key = keyMatch[1];
            const value = parts[i + 1];
            args[key] = this.coerceValue(value);
          } else {
            errors.push(
              this.options.errorMessages.invalidNamedArg
                .replace('{part}', parts[i])
                .replace('{index}', i.toString()),
            );
          }
        }
      } else {
        // Typed or equals: each part is arg
        for (let i = argStartIndex; i < parts.length; i++) {
          const match = parts[i].match(argRegex);
          if (match) {
            const [, key, value] = match;
            args[key] = this.coerceValue(value);
          } else {
            errors.push(
              this.options.errorMessages.invalidArgFormat.replace(
                '{part}',
                parts[i],
              ),
            );
          }
        }
      }
    }

    const result: ParsedCommand = {
      prefixUsed,
      command,
      subcommands,
      args,
      originalMessage: message,
    };

    if (errors.length > 0) {
      result.errors = errors;
    }

    return result;
  }
}

export { ParsedCommand, ParserOptions };
