/**
 * Tokenizes the input string, respecting quoted strings.
 * @param input - The string to tokenize.
 * @param delimiter - The delimiter to split on.
 * @returns Array of tokens.
 */
export function tokenize(input: string, delimiter: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    if (input[i] === delimiter) {
      i++;
    } else {
      const start = i;
      while (i < input.length) {
        if (input[i] === delimiter) {
          break;
        } else if (input[i] === '"') {
          i++;
          while (i < input.length && input[i] !== '"') {
            if (input[i] === '\\') i++;
            i++;
          }
          if (i < input.length) i++;
        } else {
          i++;
        }
      }
      tokens.push(input.slice(start, i));
    }
  }
  return tokens.filter((token) => token.length > 0);
}

/**
 * Coerces a string value to its appropriate type (number, boolean, date, array, or string).
 * @param value - The string value to coerce.
 * @returns The coerced value.
 */
export function coerceValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = parseFloat(value);
  if (!isNaN(num) && num.toString() === value) return num;

  // Check for date
  const date = new Date(value);
  if (!isNaN(date.getTime()) && !isNaN(Date.parse(value))) {
    // Simple check: if parsing succeeds and it's a valid date
    return date;
  }

  // Check for array (comma-separated)
  if (value.includes(',')) {
    return value.split(',').map((v) => coerceValue(v.trim()));
  }

  // If empty, assume it could be empty array or string, but for now return empty array if empty
  if (value.trim() === '') {
    return [];
  }

  return value;
}
