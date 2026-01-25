import { ParsedCommand, CommandSchema, ArgumentSchema } from './types';

/**
 * Schema validator for parsed commands.
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
        '[DEBUG] SchemaValidator.registerSchema Registering schema',
        command,
        schema,
      );
    }

    this.schemas.set(command, schema);
  }

  /**
   * Validates a single argument against its schema.
   * @param argSchema - The schema for the argument.
   * @param value - The value of the argument.
   * @param argName - The name of the argument.
   * @returns Array of validation error messages.
   */
  private validateArgument(
    argSchema: ArgumentSchema,
    value: unknown,
    argName: string,
  ): string[] {
    const errors: string[] = [];

    // Check allowedValues first, as it's applicable to all types
    if (argSchema.allowedValues && !argSchema.allowedValues.includes(value)) {
      if (this.debug) {
        console.log(
          '[DEBUG] SchemaValidator.validateArgument Value not in allowedValues:',
          argName,
          'allowed:',
          argSchema.allowedValues,
          'got:',
          value,
        );
      }
      errors.push(
        `Argument "${argName}" must be one of: ${argSchema.allowedValues.join(',')}, but got "${value}".`,
      );
    }

    // Type-specific validations
    switch (argSchema.type) {
      case 'string':
        if (typeof value === 'string') {
          if (
            argSchema.minLength !== undefined &&
            value.length < argSchema.minLength
          ) {
            if (this.debug) {
              console.log(
                '[DEBUG] SchemaValidator.validateArgument String too short:',
                argName,
                'minLength:',
                argSchema.minLength,
                'got length:',
                value.length,
              );
            }
            errors.push(
              `Argument "${argName}" must be at least ${argSchema.minLength} characters long, but got ${value.length}.`,
            );
          }

          if (
            argSchema.maxLength !== undefined &&
            value.length > argSchema.maxLength
          ) {
            if (this.debug) {
              console.log(
                '[DEBUG] SchemaValidator.validateArgument String too long:',
                argName,
                'maxLength:',
                argSchema.maxLength,
                'got length:',
                value.length,
              );
            }
            errors.push(
              `Argument "${argName}" must be at most ${argSchema.maxLength} characters long, but got ${value.length}.`,
            );
          }

          if (argSchema.pattern && !new RegExp(argSchema.pattern).test(value)) {
            if (this.debug) {
              console.log(
                '[DEBUG] SchemaValidator.validateArgument Pattern mismatch:',
                argName,
                'pattern:',
                argSchema.pattern,
                'value:',
                value,
              );
            }
            errors.push(
              `Argument "${argName}" must match pattern "${argSchema.pattern}", but got "${value}".`,
            );
          }
        }
        break;
      case 'number':
        if (typeof value === 'number') {
          const min =
            typeof argSchema.min === 'number' ? argSchema.min : undefined;
          const max =
            typeof argSchema.max === 'number' ? argSchema.max : undefined;

          if (min !== undefined && value < min) {
            if (this.debug) {
              console.log(
                '[DEBUG] SchemaValidator.validateArgument Number too small:',
                argName,
                'min:',
                min,
                'got:',
                value,
              );
            }
            errors.push(
              `Argument "${argName}" must be at least ${min}, but got ${value}.`,
            );
          }

          if (max !== undefined && value > max) {
            if (this.debug) {
              console.log(
                '[DEBUG] SchemaValidator.validateArgument Number too large:',
                argName,
                'max:',
                max,
                'got:',
                value,
              );
            }
            errors.push(
              `Argument "${argName}" must be at most ${max}, but got ${value}.`,
            );
          }
        }
        break;
      case 'array':
        if (Array.isArray(value)) {
          if (
            argSchema.minItems !== undefined &&
            value.length < argSchema.minItems
          ) {
            if (this.debug) {
              console.log(
                '[DEBUG] SchemaValidator.validateArgument Array too small:',
                argName,
                'minItems:',
                argSchema.minItems,
                'got items:',
                value.length,
              );
            }
            errors.push(
              `Argument "${argName}" must have at least ${argSchema.minItems} items, but got ${value.length}.`,
            );
          }

          if (
            argSchema.maxItems !== undefined &&
            value.length > argSchema.maxItems
          ) {
            if (this.debug) {
              console.log(
                '[DEBUG] SchemaValidator.validateArgument Array too large:',
                argName,
                'maxItems:',
                argSchema.maxItems,
                'got items:',
                value.length,
              );
            }
            errors.push(
              `Argument "${argName}" must have at most ${argSchema.maxItems} items, but got ${value.length}.`,
            );
          }
        }
        break;
      case 'date':
        if (value instanceof Date) {
          if (argSchema.min !== undefined && value < new Date(argSchema.min)) {
            if (this.debug) {
              console.log(
                '[DEBUG] SchemaValidator.validateArgument Date too early:',
                argName,
                'min:',
                argSchema.min,
                'got:',
                value.toISOString(),
              );
            }
            errors.push(
              `Argument "${argName}" must be after ${new Date(
                argSchema.min,
              ).toISOString()}, but got ${value.toISOString()}.`,
            );
          }

          if (argSchema.max !== undefined && value > new Date(argSchema.max)) {
            if (this.debug) {
              console.log(
                '[DEBUG] SchemaValidator.validateArgument Date too late:',
                argName,
                'max:',
                argSchema.max,
                'got:',
                value.toISOString(),
              );
            }
            errors.push(
              `Argument "${argName}" must be before ${new Date(
                argSchema.max,
              ).toISOString()}, but got ${value.toISOString()}.`,
            );
          }
        }
        break;
      case 'boolean':
        // No additional validations for boolean
        break;
    }

    return errors;
  }

  /**
   * Validates a parsed command against its schema.
   * @param parsed - The parsed command to validate.
   * @returns Array of validation error messages.
   */
  validate(parsed: ParsedCommand): string[] {
    if (this.debug) {
      console.log(
        '[DEBUG] SchemaValidator.validate Starting validation',
        parsed.command,
      );
    }

    const schema = this.schemas.get(parsed.command);
    if (!schema) {
      if (this.debug) {
        console.log(
          '[DEBUG] SchemaValidator.validate No schema found for command',
          parsed.command,
        );
      }

      return [];
    }

    if (this.debug) {
      console.log(
        '[DEBUG] SchemaValidator.validate Found schema',
        parsed.command,
        schema,
      );
    }

    const errors: string[] = [];

    // Check allowed subcommands
    if (schema.allowedSubcommands) {
      for (const sub of parsed.subcommands) {
        if (!schema.allowedSubcommands.includes(sub)) {
          const errorMsg = `Subcommand "${sub}" is not allowed for command "${parsed.command}".`;
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

        const value = parsed.args[argName];
        if (argSchema.required && (value === undefined || value === null)) {
          const errorMsg = `Argument "${argName}" is required for command "${parsed.command}".`;
          if (this.debug) {
            console.log(
              '[DEBUG] SchemaValidator.validate Required argument missing:',
              argName,
            );
          }
          errors.push(errorMsg);
        }

        if (value !== undefined && value !== null) {
          const expectedType = argSchema.type;
          let isValid = false;

          if (expectedType === 'date') {
            isValid = value instanceof Date;
          } else if (expectedType === 'array') {
            isValid = Array.isArray(value);
          } else {
            isValid = typeof value === expectedType;
          }

          if (!isValid) {
            const actualType = Array.isArray(value)
              ? 'array'
              : value instanceof Date
                ? 'date'
                : typeof value;
            const errorMsg = `Argument "${argName}" must be of type "${expectedType}", but got "${actualType}".`;
            if (this.debug) {
              console.log(
                '[DEBUG] SchemaValidator.validate Type mismatch for argument:',
                argName,
                'expected:',
                expectedType,
                'got:',
                actualType,
              );
            }
            errors.push(errorMsg);
          } else {
            // Type is valid, now check additional validations
            const argErrors = this.validateArgument(argSchema, value, argName);
            errors.push(...argErrors);
          }
        }
      }
    }

    // Check subcommand-specific args
    if (schema.subArgs) {
      for (const subcommand of parsed.subcommands) {
        const subSchema = schema.subArgs[subcommand];

        if (subSchema) {
          for (const [argName, argSchema] of Object.entries(subSchema)) {
            const value = parsed.args[argName];

            if (argSchema.required && (value === undefined || value === null)) {
              const errorMsg = `Argument "${argName}" is required for subcommand "${subcommand}" in command "${parsed.command}".`;
              if (this.debug) {
                console.log(
                  '[DEBUG] SchemaValidator.validate Required subcommand argument missing:',
                  argName,
                  'for subcommand:',
                  subcommand,
                );
              }
              errors.push(errorMsg);
            }

            if (value !== undefined && value !== null) {
              const expectedType = argSchema.type;
              let isValid = false;

              if (expectedType === 'date') {
                isValid = value instanceof Date;
              } else if (expectedType === 'array') {
                isValid = Array.isArray(value);
              } else {
                isValid = typeof value === expectedType;
              }

              if (!isValid) {
                const actualType = Array.isArray(value)
                  ? 'array'
                  : value instanceof Date
                    ? 'date'
                    : typeof value;
                const errorMsg = `Argument "${argName}" for subcommand "${subcommand}" must be of type "${expectedType}", but got "${actualType}".`;
                if (this.debug) {
                  console.log(
                    '[DEBUG] SchemaValidator.validate Type mismatch for subcommand argument:',
                    argName,
                    'subcommand:',
                    subcommand,
                    'expected:',
                    expectedType,
                    'got:',
                    actualType,
                  );
                }
                errors.push(errorMsg);
              } else {
                // Type is valid, now check additional validations
                const argErrors = this.validateArgument(
                  argSchema,
                  value,
                  argName,
                );
                errors.push(...argErrors);
              }
            }
          }
        }
      }
    }

    return errors;
  }
}
