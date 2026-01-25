import { Token, ParseError, ParserOptions, Mention } from '../types/index';

/**
 * Advanced tokenizer that handles mentions, quotes, and special characters.
 */
export class Tokenizer {
  private options: {
    mentionParsing: boolean;
    mentionPrefixes: {
      user: string;
      role: string;
      channel: string;
    };
    delimiter: string;
  };
  private mentionRegex: RegExp;
  private compiledRegex: RegExp;

  constructor(options: ParserOptions) {
    this.options = {
      mentionParsing: options.mentionParsing ?? true,
      mentionPrefixes: {
        user: options.mentionPrefixes?.user ?? '<@',
        role: options.mentionPrefixes?.role ?? '<@&',
        channel: options.mentionPrefixes?.channel ?? '<#',
      },
      delimiter: options.delimiter ?? ' ',
    };

    // Compile regex for performance
    const mentionPatterns = this.options.mentionParsing
      ? [
          `${this.escapeRegex(this.options.mentionPrefixes.user)}\\d+>`,
          `${this.escapeRegex(this.options.mentionPrefixes.role)}\\d+>`,
          `${this.escapeRegex(this.options.mentionPrefixes.channel)}\\d+>`,
        ]
      : [];

    this.mentionRegex = new RegExp(`(${mentionPatterns.join('|')})`, 'g');

    // Combined regex for tokenization
    const patterns = [
      this.mentionRegex.source,
      '"(?:\\\\.|[^"\\\\])*"', // Quoted strings with escapes
      `'(?:\\\\.|[^'\\\\])*'`, // Single quoted
      `\\w+\\([^)]*\\)`, // Typed arguments: key(value)
      `\\S+`, // Non-whitespace sequences
    ];

    this.compiledRegex = new RegExp(patterns.join('|'), 'g');
  }

  /**
   * Tokenizes the input message into tokens using a state machine.
   * @param message - The message to tokenize.
   * @returns Array of tokens and any parse errors.
   */
  tokenize(message: string): { tokens: Token[]; errors: ParseError[] } {
    const tokens: Token[] = [];
    const errors: ParseError[] = [];
    let i = 0;
    let currentToken = '';
    let currentPosition = 0;
    let inDoubleQuote = false;
    let inSingleQuote = false;
    let parenLevel = 0;
    let escapeNext = false;

    while (i < message.length) {
      const char = message[i];
      const isDelimiter = char === this.options.delimiter;

      if (escapeNext) {
        currentToken += char;
        escapeNext = false;
        i++;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        currentToken += char;
        i++;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        if (inDoubleQuote) {
          // End of double quote
          currentToken += char;
          inDoubleQuote = false;
        } else {
          // Start of double quote
          if (currentToken) {
            // If we have pending token, it's part of the quoted string
            currentToken += char;
            inDoubleQuote = true;
          } else {
            // Start new quoted token
            currentToken = char;
            currentPosition = i;
            inDoubleQuote = true;
          }
        }
        i++;
        continue;
      }

      if (char === "'" && !inDoubleQuote) {
        if (inSingleQuote) {
          // End of single quote
          currentToken += char;
          inSingleQuote = false;
        } else {
          // Start of single quote
          if (currentToken) {
            currentToken += char;
            inSingleQuote = true;
          } else {
            currentToken = char;
            currentPosition = i;
            inSingleQuote = true;
          }
        }
        i++;
        continue;
      }

      if (char === '(' && !inDoubleQuote && !inSingleQuote) {
        parenLevel++;
      } else if (char === ')' && !inDoubleQuote && !inSingleQuote) {
        parenLevel--;
      }

      if (isDelimiter && !inDoubleQuote && !inSingleQuote && parenLevel === 0) {
        // Delimiter outside quotes and parens, end current token
        if (currentToken) {
          tokens.push(this.createToken(currentToken, currentPosition));
          currentToken = '';
        }
        i++;
        continue;
      }

      // Add character to current token
      if (!currentToken) {
        currentPosition = i;
      }
      currentToken += char;
      i++;
    }

    // End of message, add remaining token
    if (currentToken) {
      tokens.push(this.createToken(currentToken, currentPosition));
    }

    // Check for unclosed quotes
    if (inDoubleQuote || inSingleQuote) {
      errors.push({
        type: 'parse',
        message: `Unclosed ${inDoubleQuote ? 'double' : 'single'} quote`,
        position: currentPosition,
        suggestion: `Close the quote with ${inDoubleQuote ? '"' : "'"}`,
      });
    }

    return { tokens, errors };
  }

  private createToken(value: string, position: number): Token {
    let type: Token['type'] = 'text';

    if (this.options.mentionParsing && this.mentionRegex.test(value)) {
      type = 'mention';
      this.mentionRegex.lastIndex = 0; // Reset for reuse
    } else if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      type = 'quoted';
    } else if (value.match(/^\w+\([^)]*\)$/)) {
      type = 'typed';
    }

    return {
      type,
      value,
      position,
    };
  }

  /**
   * Parses a mention token into a Mention object.
   * @param token - The mention token.
   * @returns Parsed mention or null if invalid.
   */
  parseMention(token: Token): Mention | null {
    if (token.type !== 'mention') return null;

    const value = token.value;
    let type: 'user' | 'role' | 'channel';
    let id: string;

    if (value.startsWith(this.options.mentionPrefixes.user)) {
      type = 'user';
      id = value.slice(this.options.mentionPrefixes.user.length, -1);
    } else if (value.startsWith(this.options.mentionPrefixes.role)) {
      type = 'role';
      id = value.slice(this.options.mentionPrefixes.role.length, -1);
    } else if (value.startsWith(this.options.mentionPrefixes.channel)) {
      type = 'channel';
      id = value.slice(this.options.mentionPrefixes.channel.length, -1);
    } else {
      return null;
    }

    if (!/^\d+$/.test(id)) return null;

    return { type, id, raw: value };
  }

  /**
   * Unquotes a quoted token.
   * @param token - The quoted token.
   * @returns Unquoted value.
   */
  unquote(token: Token): string {
    if (token.type !== 'quoted') return token.value;

    const value = token.value;
    const quote = value[0];
    const content = value.slice(1, -1);

    // Handle basic escapes
    return content
      .replace(new RegExp(`\\\\${quote}`, 'g'), quote)
      .replace(/\\\\/g, '\\');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private checkUnclosedQuotes(
    message: string,
  ): { type: string; position: number } | null {
    let inDoubleQuote = false;
    let inSingleQuote = false;
    let escapeNext = false;

    for (let i = 0; i < message.length; i++) {
      const char = message[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      } else if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      }
    }

    if (inDoubleQuote) {
      return { type: 'double', position: message.lastIndexOf('"') };
    }
    if (inSingleQuote) {
      return { type: 'single', position: message.lastIndexOf("'") };
    }

    return null;
  }
}
