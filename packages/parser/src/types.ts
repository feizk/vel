export interface ParserOptions {
  prefix: string | string[];
  caseSensitive?: boolean;
  delimiter?: string;
  argFormat?: 'typed' | 'equals' | 'named';
  errorMessages?: {
    prefixRequired?: string;
    invalidArgFormat?: string;
    invalidNamedArg?: string;
  };
}

export interface CommandSchema {
  /**
   * Optional list of allowed subcommands. If provided, subcommands must match one of these.
   */
  allowedSubcommands?: string[];
  /**
   * Schema for global arguments. Each key is the arg name, value defines type and if required.
   */
  args?: Record<
    string,
    {
      type: 'string' | 'number' | 'boolean';
      required?: boolean;
    }
  >;
  /**
   * Schema for subcommand-specific arguments. Key is subcommand name, value is args schema for that subcommand.
   * These args are in addition to global args.
   */
  subArgs?: Record<
    string,
    Record<
      string,
      {
        type: 'string' | 'number' | 'boolean';
        required?: boolean;
      }
    >
  >;
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
