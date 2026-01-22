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
 * Coerces a string value to its appropriate type (number, boolean, or string).
 * @param value - The string value to coerce.
 * @returns The coerced value.
 */
export function coerceValue(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = parseFloat(value);
  if (!isNaN(num) && num.toString() === value) return num;
  return value;
}
