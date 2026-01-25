export type DebugOptions = boolean;

export interface Mention {
  type: 'user' | 'role' | 'channel';
  id: string;
  raw: string;
}

export type ArgumentValue =
  | string
  | number
  | boolean
  | Date
  | Mention
  | unknown[]
  | Record<string, unknown>;

export interface ArgumentSchema {
  type:
    | 'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'array'
    | 'mention'
    | 'custom';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number | string;
  max?: number | string;
  minItems?: number;
  maxItems?: number;
  allowedValues?: unknown[];
  defaultValue?: ArgumentValue;
  customValidator?: (value: unknown) => boolean | Promise<boolean>;
  customErrorMessage?: string;
}

export interface CommandSchema {
  aliases?: string[];
  allowedSubcommands?: string[];
  args?: Record<string, ArgumentSchema>;
  subArgs?: Record<string, Record<string, ArgumentSchema>>;
  subAliases?: Record<string, string[]>;
}

export interface ParseError {
  type: 'parse' | 'validation';
  message: string;
  position?: number;
  suggestion?: string;
}

export interface ParsedCommand {
  prefixUsed: string;
  command: string;
  resolvedCommand?: string;
  subcommands: string[];
  resolvedSubcommands?: string[];
  args: Record<string, ArgumentValue>;
  originalMessage: string;
  mentions?: Mention[];
  errors?: ParseError[];
  validationErrors?: string[];
}

export interface Token {
  type: 'text' | 'mention' | 'quoted' | 'typed' | 'separator';
  value: string;
  position: number;
}

export interface ParseContext {
  message: string;
  position: number;
  tokens: Token[];
  errors: ParseError[];
}

export interface ParserOptions {
  prefix: string | string[];
  caseSensitive?: boolean;
  delimiter?: string;
  argFormat?: 'typed' | 'equals' | 'named';
  debug?: DebugOptions;
  mentionParsing?: boolean;
  mentionPrefixes?: {
    user?: string;
    role?: string;
    channel?: string;
  };
}
