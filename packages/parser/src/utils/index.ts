/**
 * Coerces a string value to its appropriate type (number, boolean, date, array, or string).
 * Enhanced version with better type detection and error handling.
 * @param value - The string value to coerce.
 * @param debug - Whether to enable debug logging.
 * @returns The coerced value.
 */
export function coerceValue(value: string, debug: boolean = false): unknown {
  if (debug) {
    console.log('[DEBUG] coerceValue Starting coercion:', value);
  }

  // Handle empty strings
  if (value.trim() === '') {
    if (debug)
      console.log('[DEBUG] coerceValue Empty string, returning empty string');
    return '';
  }

  // Boolean detection
  if (value === 'true') {
    if (debug) console.log('[DEBUG] coerceValue Coerced to boolean true');
    return true;
  }
  if (value === 'false') {
    if (debug) console.log('[DEBUG] coerceValue Coerced to boolean false');
    return false;
  }

  // Number detection
  const num = parseFloat(value);
  if (!isNaN(num) && num.toString() === value) {
    if (debug) console.log('[DEBUG] coerceValue Coerced to number:', num);
    return num;
  }

  // Array detection (comma-separated, but more robust)
  if (value.includes(',')) {
    const parts = value.split(',').map((p) => p.trim());
    // Only coerce to array if all parts can be coerced or if it's clearly an array
    const coercedParts = parts.map((p) => coerceValue(p, debug));
    if (debug)
      console.log('[DEBUG] coerceValue Coerced to array:', coercedParts);
    return coercedParts;
  }

  // Date detection
  const date = new Date(value);
  if (!isNaN(date.getTime()) && !isNaN(Date.parse(value))) {
    if (debug)
      console.log('[DEBUG] coerceValue Coerced to date:', date.toISOString());
    return date;
  }

  // Default to string
  if (debug) console.log('[DEBUG] coerceValue Kept as string:', value);
  return value;
}

/**
 * Resolves command aliases.
 * @param command - The command to resolve.
 * @param aliases - Map of aliases to commands.
 * @returns The resolved command and original if aliased.
 */
export function resolveCommandAlias(
  command: string,
  aliases: Record<string, string[]>,
): { resolved: string; original?: string } {
  for (const [resolvedCmd, aliasList] of Object.entries(aliases)) {
    if (aliasList.includes(command)) {
      return { resolved: resolvedCmd, original: command };
    }
  }
  return { resolved: command };
}

/**
 * Resolves subcommand aliases.
 * @param subcommands - The subcommands to resolve.
 * @param subAliases - Map of subcommand aliases.
 * @returns The resolved subcommands and originals if aliased.
 */
export function resolveSubcommandAliases(
  subcommands: string[],
  subAliases: Record<string, string[]>,
): { resolved: string[]; originals?: string[] } {
  const resolved: string[] = [];
  const originals: string[] = [];
  let hasAliases = false;

  for (const sub of subcommands) {
    let found = false;
    for (const [resolvedSub, aliasList] of Object.entries(subAliases)) {
      if (aliasList.includes(sub)) {
        resolved.push(resolvedSub);
        originals.push(sub);
        found = true;
        hasAliases = true;
        break;
      }
    }
    if (!found) {
      resolved.push(sub);
      originals.push(sub);
    }
  }

  return hasAliases ? { resolved, originals } : { resolved };
}
