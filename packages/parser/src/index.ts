import { ParserOptions, ParsedCommand, CommandSchema } from './types/index';
import { MessageParser } from './core/index';
import { SchemaValidator } from './validation/index';

/**
 * Main parser class that combines message parsing and schema validation.
 * Provides a high-level API for parsing messages with optional validation.
 */
export class Parser {
  private messageParser: MessageParser;
  private schemaValidator: SchemaValidator;
  private lastParsed: ParsedCommand | null = null;
  private debug: boolean;

  /**
   * Creates an instance of Parser.
   * @param options - The configuration options for the parser.
   */
  constructor(options: ParserOptions) {
    if (
      !options.prefix ||
      (Array.isArray(options.prefix) && options.prefix.length === 0)
    ) {
      throw new Error('Prefix must be provided');
    }

    this.debug = options.debug ?? false;

    this.messageParser = new MessageParser(options);
    this.schemaValidator = new SchemaValidator(this.debug);
  }

  /**
   * Registers a schema for a specific command to enable validation.
   * @param command - The command name to register the schema for.
   * @param schema - The schema defining validation rules for the command.
   */
  registerSchema(command: string, schema: CommandSchema): void {
    this.schemaValidator.registerSchema(command, schema);
  }

  /**
   * Retrieves the last successfully parsed command.
   * @returns The last parsed command or null if none has been parsed.
   */
  getLastParsed(): ParsedCommand | null {
    return this.lastParsed;
  }

  /**
   * Parses a message into a command structure with optional validation.
   * @param message - The message to parse.
   * @returns The parsed command or null if invalid.
   */
  async parse(message: string): Promise<ParsedCommand | null> {
    if (this.debug) {
      console.log('[DEBUG] [Parser.parse] Starting parsing message', message);
    }

    const result = this.messageParser.parse(message);
    if (!result) {
      if (this.debug) {
        console.log(
          '[DEBUG] [Parser.parse] Message parsing failed, returning null',
          message,
        );
      }
      return null;
    }

    if (this.debug) {
      console.log(
        '[DEBUG] [Parser.parse] Message parsed successfully',
        result.command,
        result.subcommands,
        result.args,
      );
    }

    const validationErrors = await this.schemaValidator.validate(result);
    if (validationErrors.length > 0) {
      console.warn(
        '[WARN] [Parser.parse] Validation errors found',
        validationErrors,
      );
      result.validationErrors = validationErrors;
    } else {
      if (this.debug) {
        console.log('[DEBUG] [Parser.parse] No validation errors');
      }
    }

    this.lastParsed = result;
    if (this.debug) {
      console.log(
        '[INFO] [Parser.parse] Parsing completed successfully',
        result.command,
      );
    }
    return result;
  }
}

// Export all public classes and types
export { MessageParser } from './core/index';
export { SchemaValidator } from './validation/index';
export {
  ParsedCommand,
  ParserOptions,
  CommandSchema,
  DebugOptions,
  ArgumentSchema,
  Mention,
  ParseError,
} from './types/index';
