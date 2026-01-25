export type DebugOptions = boolean;

export interface ParserOptions {
  prefix: string | string[];
  caseSensitive?: boolean;
  delimiter?: string;
  argFormat?: 'typed' | 'equals' | 'named';
  debug?: DebugOptions;
}

export interface ArgumentSchema {
  /**
   * The type of the argument.
   */
  type: 'string' | 'number' | 'boolean' | 'date' | 'array';
  /**
   * Whether the argument is required.
   */
  required?: boolean;
  /**
   * Minimum length for string arguments.
   */
  minLength?: number;
  /**
   * Maximum length for string arguments.
   */
  maxLength?: number;
  /**
   * Regex pattern for string arguments.
   */
  pattern?: string;
  /**
   * Minimum value for number or date arguments.
   */
  min?: number | string;
  /**
   * Maximum value for number or date arguments.
   */
  max?: number | string;
  /**
   * Minimum number of items for array arguments.
   */
  minItems?: number;
  /**
   * Maximum number of items for array arguments.
   */
  maxItems?: number;
  /**
   * List of allowed values for any type.
   */
  allowedValues?: unknown[];
}

export interface CommandSchema {
  /**
   * Optional list of allowed subcommands. If provided, subcommands must match one of these.
   */
  allowedSubcommands?: string[];
  /**
   * Schema for global arguments. Each key is the arg name, value defines the schema for that argument.
   */
  args?: Record<string, ArgumentSchema>;
  /**
   * Schema for subcommand-specific arguments. Key is subcommand name, value is args schema for that subcommand.
   * These args are in addition to global args.
   */
  subArgs?: Record<string, Record<string, ArgumentSchema>>;
}

export interface ParsedCommand {
  prefixUsed: string;
  command: string;
  subcommands: string[];
  args: Record<string, unknown>;
  originalMessage: string;
  errors?: string[];
  validationErrors?: string[];
}
