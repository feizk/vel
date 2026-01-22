import { ParserOptions, ParsedCommand } from './types';
import { tokenize, coerceValue } from './utils';

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
    const parts = tokenize(content, this.options.delimiter);

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

    // Helper to check if a part is an argument
    const isArg = (part: string): boolean => {
      if (isPairFormat) {
        return argRegex.test(part);
      } else {
        return argRegex.test(part);
      }
    };

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
      const argsContent = parts
        .slice(argStartIndex)
        .join(this.options.delimiter);
      let remaining = argsContent;

      if (isPairFormat) {
        // Named: --key value pairs
        while (remaining.trim()) {
          const keyMatch = remaining.match(argRegex);
          if (!keyMatch) {
            errors.push(
              this.options.errorMessages.invalidNamedArg
                .replace('{part}', remaining.split(' ')[0])
                .replace('{index}', 'unknown'),
            );
            break;
          }
          const key = keyMatch[1];
          remaining = remaining.slice(keyMatch[0].length).trim();

          if (!remaining) {
            errors.push(
              this.options.errorMessages.invalidNamedArg
                .replace('{part}', keyMatch[0])
                .replace('{index}', 'unknown'),
            );
            break;
          }

          // Parse value
          let value: string;
          if (remaining.startsWith('"')) {
            const endQuote = remaining.indexOf('"', 1);
            if (endQuote === -1) {
              errors.push(
                this.options.errorMessages.invalidNamedArg
                  .replace('{part}', remaining)
                  .replace('{index}', 'unknown'),
              );
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
      } else {
        // Typed or equals: parse sequentially
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
              this.options.errorMessages.invalidArgFormat.replace(
                '{part}',
                remaining.split(this.options.delimiter)[0],
              ),
            );
            break;
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
