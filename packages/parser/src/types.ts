export interface ParserOptions {
  prefix: string | string[];
  caseSensitive?: boolean;
  delimiter?: string;
  argFormat?: 'typed' | 'equals' | 'named';
}

export interface ParsedCommand {
  prefixUsed: string;
  command: string;
  subcommands: string[];
  args: Record<string, string>;
  originalMessage: string;
  errors?: string[];
}
