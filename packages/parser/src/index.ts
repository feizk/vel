import {
  ParserOptions,
  ParsedCommand,
  CommandSchema,
  DebugOptions,
} from './types';
import { MessageParser } from './parser';
import { SchemaValidator } from './validator';
import { Logger } from '@feizk/logger';

/**
 * Main parser class that combines message parsing and schema validation.
 * Provides a high-level API for parsing messages with optional validation.
 */
export class Parser {
  private messageParser: MessageParser;
  private schemaValidator: SchemaValidator;
  private lastParsed: ParsedCommand | null = null;
  private logger: Logger;

  /**
   * Creates an instance of Parser.
   * @param options - The configuration options for the parser.
   */
  constructor(options: ParserOptions) {
    this.logger = new Logger({
      enabled: options.debug?.enabled ?? false,
      ...options.debug,
    });

    this.messageParser = new MessageParser(options, this.logger);
    this.schemaValidator = new SchemaValidator(this.logger);
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
  parse(message: string): ParsedCommand | null {
    this.logger.debug('parse Starting parsing message', message);

    const result = this.messageParser.parse(message);
    if (!result) {
      this.logger.debug(
        'parse Message parsing failed, returning null',
        message,
      );
      return null;
    }

    this.logger.debug(
      'parse Message parsed successfully',
      result.command,
      result.subcommands,
      result.args,
    );

    const validationErrors = this.schemaValidator.validate(result);
    if (validationErrors.length > 0) {
      this.logger.warn('parse Validation errors found', validationErrors);
      result.validationErrors = validationErrors;
    } else {
      this.logger.debug('parse No validation errors');
    }

    this.lastParsed = result;
    this.logger.info('parse Parsing completed successfully', result.command);
    return result;
  }
}

// Export all public classes and types
export { MessageParser } from './parser';
export { SchemaValidator } from './validator';
export { ParsedCommand, ParserOptions, CommandSchema, DebugOptions };
