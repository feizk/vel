import {
  Token,
  ArgumentValue,
  ParserOptions,
  ParseError,
} from '../types/index';
import { coerceValue } from '../utils';

/**
 * Argument parser that handles different argument formats with improved error recovery.
 */
export class ArgumentParser {
  private options: Required<Pick<ParserOptions, 'argFormat' | 'delimiter'>>;
  private debug: boolean;

  constructor(options: ParserOptions, debug: boolean) {
    this.options = {
      argFormat: options.argFormat ?? 'typed',
      delimiter: options.delimiter ?? ' ',
    };
    this.debug = debug;
  }

  /**
   * Parses arguments from tokens.
   * @param tokens - Tokens to parse from.
   * @param startIndex - Index to start parsing arguments.
   * @returns Parsed arguments and any errors.
   */
  parseArguments(
    tokens: Token[],
    startIndex: number,
  ): {
    args: Record<string, ArgumentValue>;
    errors: ParseError[];
  } {
    const args: Record<string, ArgumentValue> = {};
    const errors: ParseError[] = [];

    if (this.debug) {
      console.log(
        '[DEBUG] [ArgumentParser.parseArguments] Starting argument parsing from index',
        startIndex,
        'with format',
        this.options.argFormat,
      );
    }

    if (startIndex < 0 || startIndex >= tokens.length) {
      if (this.debug) {
        console.log(
          '[DEBUG] [ArgumentParser.parseArguments] No arguments to parse (invalid start index)',
        );
      }
      return { args, errors };
    }

    switch (this.options.argFormat) {
      case 'typed':
        this.parseTypedArgs(tokens, startIndex, args, errors);
        break;
      case 'equals':
        this.parseEqualsArgs(tokens, startIndex, args, errors);
        break;
      case 'named':
        this.parseNamedArgs(tokens, startIndex, args, errors);
        break;
      default:
        this.parseTypedArgs(tokens, startIndex, args, errors);
    }

    if (this.debug) {
      console.log(
        '[DEBUG] [ArgumentParser.parseArguments] Argument parsing completed',
        'args:',
        args,
        'errors:',
        errors.length,
      );
    }

    return { args, errors };
  }

  private parseTypedArgs(
    tokens: Token[],
    startIndex: number,
    args: Record<string, ArgumentValue>,
    errors: ParseError[],
  ): void {
    for (let i = startIndex; i < tokens.length; i++) {
      const token = tokens[i];
      const match = token.value.match(/^(\w+)\((.*)\)$/);
      if (match) {
        const [, key, valueStr] = match;
        const value = this.parseValue(valueStr, token.position, errors);
        if (value !== undefined) {
          args[key] = value;
        }
      } else {
        errors.push({
          type: 'parse',
          message: `Invalid typed argument format: "${token.value}"`,
          position: token.position,
          suggestion: 'Use format: key(value)',
        });
      }
    }
  }

  private parseEqualsArgs(
    tokens: Token[],
    startIndex: number,
    args: Record<string, ArgumentValue>,
    errors: ParseError[],
  ): void {
    for (let i = startIndex; i < tokens.length; i++) {
      const token = tokens[i];
      const match = token.value.match(/^(\w+)=(.*)$/);
      if (match) {
        const [, key, valueStr] = match;
        const value = this.parseValue(valueStr, token.position, errors);
        if (value !== undefined) {
          args[key] = value;
        }
      } else {
        errors.push({
          type: 'parse',
          message: `Invalid equals argument format: "${token.value}"`,
          position: token.position,
          suggestion: 'Use format: key=value',
        });
      }
    }
  }

  private parseNamedArgs(
    tokens: Token[],
    startIndex: number,
    args: Record<string, ArgumentValue>,
    errors: ParseError[],
  ): void {
    let i = startIndex;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token.value.startsWith('--')) {
        const key = token.value.slice(2);
        i++;
        if (i < tokens.length) {
          const valueToken = tokens[i];
          const value = this.parseValue(
            valueToken.value,
            valueToken.position,
            errors,
          );
          if (value !== undefined) {
            args[key] = value;
          }
          i++;
        } else {
          errors.push({
            type: 'parse',
            message: `Named argument "${key}" missing value`,
            position: token.position,
            suggestion: 'Provide a value after --key',
          });
        }
      } else {
        errors.push({
          type: 'parse',
          message: `Unexpected token in named args: "${token.value}"`,
          position: token.position,
          suggestion: 'Use --key value format',
        });
        i++;
      }
    }
  }

  private parseValue(
    valueStr: string,
    position: number,
    errors: ParseError[],
  ): ArgumentValue | undefined {
    try {
      if (this.debug) {
        console.log(
          '[DEBUG] [ArgumentParser.parseValue] Parsing value:',
          valueStr,
        );
      }

      // Handle quoted strings
      let cleanedValue = valueStr;
      if (
        (cleanedValue.startsWith('"') && cleanedValue.endsWith('"')) ||
        (cleanedValue.startsWith("'") && cleanedValue.endsWith("'"))
      ) {
        cleanedValue = cleanedValue.slice(1, -1);
        if (this.debug) {
          console.log(
            '[DEBUG] [ArgumentParser.parseValue] Unquoted value:',
            cleanedValue,
          );
        }
      }

      const result = coerceValue(cleanedValue, this.debug) as ArgumentValue;
      if (this.debug) {
        console.log(
          '[DEBUG] [ArgumentParser.parseValue] Coerced result:',
          result,
        );
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.debug) {
        console.log(
          '[DEBUG] [ArgumentParser.parseValue] Parse error:',
          message,
        );
      }
      errors.push({
        type: 'parse',
        message: `Failed to parse value "${valueStr}": ${message}`,
        position,
      });
      return undefined;
    }
  }
}
