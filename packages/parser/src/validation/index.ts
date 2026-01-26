import { ParsedCommand, CommandSchema, ArgumentSchema } from '../types/index';
import { resolveCommandAlias, resolveSubcommandAliases } from '../utils/index';

/**
 * Schema validation orchestrator with support for aliases and custom validators.
 */
export class SchemaValidator {
  private schemas: Map<string, CommandSchema> = new Map();
  private debug: boolean;

  constructor(debug: boolean) {
    this.debug = debug;
  }

  /**
   * Registers a schema for a specific command.
   * @param command - The command name.
   * @param schema - The schema to register.
   */
  registerSchema(command: string, schema: CommandSchema): void {
    if (this.debug) {
      console.log(
        '[DEBUG] [SchemaValidator.registerSchema] Registering schema',
        command,
        schema,
      );
    }
    this.schemas.set(command, schema);
  }

  /**
   * Validates a parsed command against its schema.
   * @param parsed - The parsed command to validate.
   * @returns Array of validation error messages.
   */
  async validate(parsed: ParsedCommand): Promise<string[]> {
    if (this.debug) {
      console.log(
        '[DEBUG] [SchemaValidator.validate] Starting validation',
        parsed.command,
      );
    }

    // Resolve aliases
    const { resolved: resolvedCommand, original: originalCommand } =
      resolveCommandAlias(parsed.command, this.getCommandAliases());

    const { resolved: resolvedSubcommands, originals: originalSubcommands } =
      resolveSubcommandAliases(
        parsed.subcommands,
        this.getSubcommandAliases(resolvedCommand),
      );

    // Update parsed command with resolved values
    parsed.command = resolvedCommand;
    parsed.resolvedCommand = originalCommand;
    parsed.subcommands = resolvedSubcommands;
    parsed.resolvedSubcommands = originalSubcommands;

    if (this.debug) {
      console.log(
        '[DEBUG] [SchemaValidator.validate] Aliases resolved - command:',
        resolvedCommand,
        'subcommands:',
        resolvedSubcommands,
      );
    }

    const schema = this.schemas.get(resolvedCommand);
    if (!schema) {
      if (this.debug) {
        console.log(
          '[DEBUG] [SchemaValidator.validate] No schema found for command',
          resolvedCommand,
        );
      }
      return [];
    }

    if (this.debug) {
      console.log(
        '[DEBUG] [SchemaValidator.validate] Found schema',
        resolvedCommand,
        schema,
      );
    }
    const errors: string[] = [];

    // Check allowed subcommands
    if (schema.allowedSubcommands) {
      for (const sub of resolvedSubcommands) {
        if (!schema.allowedSubcommands.includes(sub)) {
          const errorMsg = `Subcommand "${sub}" is not allowed for command "${resolvedCommand}".`;
          if (this.debug) {
            console.log(
              '[DEBUG] SchemaValidator.validate Invalid subcommand:',
              sub,
            );
          }
          errors.push(errorMsg);
        }
      }
    }

    // Validate arguments
    const argErrors = await this.validateArguments(parsed, schema);
    errors.push(...argErrors);

    return errors;
  }

  private getCommandAliases(): Record<string, string[]> {
    const aliases: Record<string, string[]> = {};
    for (const [command, schema] of this.schemas) {
      if (schema.aliases) {
        for (const alias of schema.aliases) {
          if (!aliases[command]) aliases[command] = [];
          aliases[command].push(alias);
        }
      }
    }
    return aliases;
  }

  private getSubcommandAliases(command: string): Record<string, string[]> {
    const schema = this.schemas.get(command);
    return schema?.subAliases || {};
  }

  private async validateArguments(
    parsed: ParsedCommand,
    schema: CommandSchema,
  ): Promise<string[]> {
    const errors: string[] = [];

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
        const argErrors = await this.validateArgument(
          argSchema,
          parsed.args[argName],
          argName,
          parsed.command,
        );
        errors.push(...argErrors);
      }
    }

    // Check subcommand-specific args
    if (schema.subArgs) {
      for (const subcommand of parsed.subcommands) {
        const subSchema = schema.subArgs[subcommand];
        if (subSchema) {
          for (const [argName, argSchema] of Object.entries(subSchema)) {
            const argErrors = await this.validateArgument(
              argSchema,
              parsed.args[argName],
              argName,
              parsed.command,
              subcommand,
            );
            errors.push(...argErrors);
          }
        }
      }
    }

    return errors;
  }

  private async validateArgument(
    argSchema: ArgumentSchema,
    value: unknown,
    argName: string,
    command: string,
    subcommand?: string,
  ): Promise<string[]> {
    const errors: string[] = [];

    // Check allowedValues first, as it's applicable to all types
    if (argSchema.allowedValues && !argSchema.allowedValues.includes(value)) {
      if (this.debug) {
        console.log(
          '[DEBUG] [SchemaValidator.validateArgument] Value not in allowedValues:',
          argName,
          'allowed:',
          argSchema.allowedValues,
          'got:',
          value,
        );
      }
      const context = subcommand ? ` for subcommand "${subcommand}"` : '';
      errors.push(
        `Argument "${argName}"${context} must be one of: ${argSchema.allowedValues.join(',')}, but got "${value}".`,
      );
    }

    // Check required
    if (argSchema.required && (value === undefined || value === null)) {
      const context = subcommand ? ` for subcommand "${subcommand}"` : '';
      errors.push(
        `Argument "${argName}"${context} is required for command "${command}".`,
      );
      return errors; // No further validation if required and missing
    }

    if (value === undefined || value === null) {
      return errors; // No value to validate
    }

    // Type-specific validations
    const typeErrors = await this.validateType(
      argSchema,
      value,
      argName,
      command,
      subcommand,
    );
    errors.push(...typeErrors);

    return errors;
  }

  private async validateType(
    argSchema: ArgumentSchema,
    value: unknown,
    argName: string,
    command: string,
    subcommand?: string,
  ): Promise<string[]> {
    const errors: string[] = [];
    const context = subcommand ? ` for subcommand "${subcommand}"` : '';

    switch (argSchema.type) {
      case 'string':
        if (typeof value === 'string') {
          if (
            argSchema.minLength !== undefined &&
            value.length < argSchema.minLength
          ) {
            errors.push(
              `Argument "${argName}"${context} must be at least ${argSchema.minLength} characters long, but got ${value.length}.`,
            );
          }
          if (
            argSchema.maxLength !== undefined &&
            value.length > argSchema.maxLength
          ) {
            errors.push(
              `Argument "${argName}"${context} must be at most ${argSchema.maxLength} characters long, but got ${value.length}.`,
            );
          }
          if (argSchema.pattern && !new RegExp(argSchema.pattern).test(value)) {
            errors.push(
              `Argument "${argName}"${context} must match pattern "${argSchema.pattern}", but got "${value}".`,
            );
          }
        } else {
          errors.push(
            `Argument "${argName}"${context} must be of type "string", but got "${typeof value}".`,
          );
        }
        break;

      case 'number':
        if (typeof value === 'number') {
          const min =
            typeof argSchema.min === 'number' ? argSchema.min : undefined;
          const max =
            typeof argSchema.max === 'number' ? argSchema.max : undefined;
          if (min !== undefined && value < min) {
            errors.push(
              `Argument "${argName}"${context} must be at least ${min}, but got ${value}.`,
            );
          }
          if (max !== undefined && value > max) {
            errors.push(
              `Argument "${argName}"${context} must be at most ${max}, but got ${value}.`,
            );
          }
        } else {
          errors.push(
            `Argument "${argName}"${context} must be of type "number", but got "${typeof value}".`,
          );
        }
        break;

      case 'array':
        if (Array.isArray(value)) {
          if (
            argSchema.minItems !== undefined &&
            value.length < argSchema.minItems
          ) {
            errors.push(
              `Argument "${argName}"${context} must have at least ${argSchema.minItems} items, but got ${value.length}.`,
            );
          }
          if (
            argSchema.maxItems !== undefined &&
            value.length > argSchema.maxItems
          ) {
            errors.push(
              `Argument "${argName}"${context} must have at most ${argSchema.maxItems} items, but got ${value.length}.`,
            );
          }
          if (argSchema.pattern) {
            for (let i = 0; i < value.length; i++) {
              const element = value[i];
              if (
                typeof element === 'string' &&
                !new RegExp(argSchema.pattern).test(element)
              ) {
                errors.push(
                  `Argument "${argName}"${context} element at index ${i} must match pattern "${argSchema.pattern}", but got "${element}".`,
                );
              }
            }
          }
        } else {
          errors.push(
            `Argument "${argName}"${context} must be of type "array", but got "${typeof value}".`,
          );
        }
        break;

      case 'date':
        if (value instanceof Date) {
          if (argSchema.min !== undefined && value < new Date(argSchema.min)) {
            errors.push(
              `Argument "${argName}"${context} must be after ${new Date(argSchema.min).toISOString()}, but got ${value.toISOString()}.`,
            );
          }
          if (argSchema.max !== undefined && value > new Date(argSchema.max)) {
            errors.push(
              `Argument "${argName}"${context} must be before ${new Date(argSchema.max).toISOString()}, but got ${value.toISOString()}.`,
            );
          }
        } else {
          errors.push(
            `Argument "${argName}"${context} must be of type "date", but got "${typeof value}".`,
          );
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(
            `Argument "${argName}"${context} must be of type "boolean", but got "${typeof value}".`,
          );
        }
        break;

      case 'mention':
        // Mentions are validated by the tokenizer, assume valid
        break;

      case 'custom':
        if (argSchema.customValidator) {
          try {
            const isValid = await argSchema.customValidator(value);
            if (!isValid) {
              const message =
                argSchema.customErrorMessage ||
                `Argument "${argName}"${context} failed custom validation.`;
              errors.push(message);
            }
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            errors.push(
              `Argument "${argName}"${context} custom validation error: ${message}`,
            );
          }
        }
        break;
    }

    return errors;
  }
}
