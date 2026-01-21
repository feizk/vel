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

export interface ParsedCommand {
  prefixUsed: string;
  command: string;
  subcommands: string[];
  args: Record<string, unknown>;
  originalMessage: string;
  errors?: string[];
}
