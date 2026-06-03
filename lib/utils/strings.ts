/**
 * String & Object Utilities
 *
 * Helper functions for string manipulation and object operations.
 */

// =============================================================================
// STRING UTILITIES
// =============================================================================

/**
 * Converts text to URL-friendly slug format.
 *
 * @param text - Text to convert (must have toString method)
 * @returns URL-safe slug string
 *
 * @example
 * ```ts
 * slugify('Hello World!') // 'hello-world'
 * slugify('Café & Restaurant') // 'cafe-restaurant'
 * ```
 */
export function slugify(text: { toString: () => string }) {
  return text
    .toString()
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
}

/**
 * Lowercases the first character of a string.
 *
 * @param inputString - String to transform
 * @returns String with the first character lowercased
 *
 * @example
 * ```ts
 * lowerFirstChar('HelloWorld') // 'helloWorld'
 * lowerFirstChar('Foo') // 'foo'
 * ```
 */
export function lowerFirstChar(inputString: string) {
  return inputString.charAt(0).toLowerCase() + inputString.slice(1)
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param inputString - String to capitalize
 * @returns String with capitalized first letter
 *
 * @example
 * ```ts
 * capitalizeFirstLetter('hello') // 'Hello'
 * capitalizeFirstLetter('world') // 'World'
 * ```
 */
export function capitalizeFirstLetter(inputString: string) {
  return inputString.charAt(0).toUpperCase() + inputString.slice(1)
}

// =============================================================================
// ARRAY & OBJECT UTILITIES
// =============================================================================

/**
 * Checks if an array is empty or if the input is not an array.
 *
 * @param arr - Array or value to check
 * @returns True if empty array or not an array
 *
 * @example
 * ```ts
 * isEmptyArray([])      // true
 * isEmptyArray([1, 2])  // false
 * isEmptyArray('test')  // true (not an array)
 * isEmptyArray(null)    // true
 * ```
 */
export function isEmptyArray(arr: string | unknown[]) {
  if (!arr) return true
  return Array.isArray(arr) && arr.length === 0
}
