import { ParserOptions, ParsedCommand, CommandSchema } from './types';
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

  private schemas: Map<string, CommandSchema> = new Map();
  private lastParsed: ParsedCommand | null = null;

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
   * Registers a schema for a specific command to enable validation.
   * @param command - The command name to register the schema for.
   * @param schema - The schema defining validation rules for the command.
   */
  registerSchema(command: string, schema: CommandSchema): void {
    this.schemas.set(command, schema);
  }

  /**
   * Retrieves the last successfully parsed command.
   * @returns The last parsed command or null if none has been parsed.
   */
  getLastParsed(): ParsedCommand | null {
    return this.lastParsed;
  }

  /**
   * Validates the parsed command against its registered schema.
   * @param parsed - The parsed command to validate.
   * @returns Array of validation error messages.
   */
  private validate(parsed: ParsedCommand): string[] {
    const schema = this.schemas.get(parsed.command);
    if (!schema) return [];

    const errors: string[] = [];

    // Check allowed subcommands
    if (schema.allowedSubcommands) {
      for (const sub of parsed.subcommands) {
        if (!schema.allowedSubcommands.includes(sub)) {
          errors.push(
            `Subcommand "${sub}" is not allowed for command "${parsed.command}".`,
          );
        }
      }
    }

    // Collect args that are overridden by subcommand-specific schemas
    const overriddenArgs = new Set<string>();
    if (schema.subArgs) {
      for (const subcommand of parsed.subcommands) {
        const subSchema = schema.subArgs[subcommand];
        if (subSchema) {
          for (const argName of Object.keys(subSchema)) {
            overriddenArgs.add(argName);
          }
        }
      }
    }

    // Check global args (skip if overridden by subcommand-specific)
    if (schema.args) {
      for (const [argName, argSchema] of Object.entries(schema.args)) {
        if (overriddenArgs.has(argName)) continue;
        const value = parsed.args[argName];
        if (argSchema.required && (value === undefined || value === null)) {
          errors.push(
            `Argument "${argName}" is required for command "${parsed.command}".`,
          );
        }
        if (value !== undefined && value !== null) {
          const expectedType = argSchema.type;
          const actualType = typeof value;
          if (expectedType !== actualType) {
            errors.push(
              `Argument "${argName}" must be of type "${expectedType}", but got "${actualType}".`,
            );
          }
        }
      }
    }

    // Check subcommand-specific args
    if (schema.subArgs) {
      for (const subcommand of parsed.subcommands) {
        const subSchema = schema.subArgs[subcommand];
        if (subSchema) {
          for (const [argName, argSchema] of Object.entries(subSchema)) {
            const value = parsed.args[argName];
            if (argSchema.required && (value === undefined || value === null)) {
              errors.push(
                `Argument "${argName}" is required for subcommand "${subcommand}" in command "${parsed.command}".`,
              );
            }
            if (value !== undefined && value !== null) {
              const expectedType = argSchema.type;
              const actualType = typeof value;
              if (expectedType !== actualType) {
                errors.push(
                  `Argument "${argName}" for subcommand "${subcommand}" must be of type "${expectedType}", but got "${actualType}".`,
                );
              }
            }
          }
        }
      }
    }

    return errors;
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

    const { prefixUsed, content } = this.findPrefix(message);
    if (!content.trim()) {
      return null;
    }

    const parts = tokenize(content.trim(), this.options.delimiter);
    if (parts.length === 0) {
      return null;
    }

    const command = parts[0];
    const { subcommands, args, errors } = this.parseParts(parts);

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

    const validationErrors = this.validate(result);
    if (validationErrors.length > 0) {
      result.validationErrors = validationErrors;
    }

    this.lastParsed = result;
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

export { ParsedCommand, ParserOptions, CommandSchema };
