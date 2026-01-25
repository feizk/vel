/**
 * Tokenizes the input string, respecting quoted strings.
 * @param input - The string to tokenize.
 * @param delimiter - The delimiter to split on.
 * @param debug - Whether to enable debug logging.
 * @returns Array of tokens.
 */
export function tokenize(
  input: string,
  delimiter: string,
  debug: boolean = false,
): string[] {
  if (debug) {
    console.log(
      '[DEBUG] tokenize Starting tokenization:',
      input,
      'delimiter:',
      delimiter,
    );
  }

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

  const result = tokens.filter((token) => token.length > 0);
  if (debug) {
    console.log('[DEBUG] tokenize Tokenization result:', result);
  }

  return result;
}

/**
 * Coerces a string value to its appropriate type (number, boolean, date, array, or string).
 * @param value - The string value to coerce.
 * @param debug - Whether to enable debug logging.
 * @returns The coerced value.
 */
export function coerceValue(value: string, debug: boolean = false): unknown {
  if (debug) {
    console.log('[DEBUG] coerceValue Starting coercion:', value);
  }

  if (value === 'true') {
    if (debug) console.log('[DEBUG] coerceValue Coerced to boolean true');
    return true;
  }
  if (value === 'false') {
    if (debug) console.log('[DEBUG] coerceValue Coerced to boolean false');
    return false;
  }

  const num = parseFloat(value);
  if (!isNaN(num) && num.toString() === value) {
    if (debug) console.log('[DEBUG] coerceValue Coerced to number:', num);
    return num;
  }

  // Check for date
  const date = new Date(value);
  if (!isNaN(date.getTime()) && !isNaN(Date.parse(value))) {
    if (debug)
      console.log('[DEBUG] coerceValue Coerced to date:', date.toISOString());
    return date;
  }

  // Check for array (comma-separated)
  if (value.includes(',')) {
    const arrayResult = value
      .split(',')
      .map((v) => coerceValue(v.trim(), debug));
    if (debug)
      console.log('[DEBUG] coerceValue Coerced to array:', arrayResult);
    return arrayResult;
  }

  // If empty, assume it could be empty array or string, but for now return empty array if empty
  if (value.trim() === '') {
    if (debug) console.log('[DEBUG] coerceValue Coerced to empty array');
    return [];
  }

  if (debug) console.log('[DEBUG] coerceValue Kept as string:', value);
  return value;
}
