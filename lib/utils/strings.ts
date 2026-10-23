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

export function lowerFirstChar(inputString: string) {
  return inputString.charAt(0).toLowerCase() + inputString.slice(1)
}

export function capitalizeFirstLetter(inputString: string) {
  return inputString.charAt(0).toUpperCase() + inputString.slice(1)
}

/** True for an empty array, a non-array falsy value, `null` and `undefined`. */
export function isEmptyArray(arr: string | unknown[] | null | undefined) {
  if (!arr) return true
  return Array.isArray(arr) && arr.length === 0
}

/**
 * Strips all HTML tags via a single linear scan, deliberately not a regex
 * replace: `str.replace(/<[^>]*>/g, '')` is an incomplete sanitizer (CodeQL
 * js/incomplete-multi-character-sanitization) that can leave an unterminated
 * `<script` or reassemble a tag from the remainder. The scan drops everything
 * between `<` and the next `>` and discards a trailing unterminated tag.
 */
export function stripHtmlTags(input: string): string {
  let output = ''
  let insideTag = false
  for (const char of input) {
    if (char === '<') {
      insideTag = true
    } else if (char === '>') {
      insideTag = false
    } else if (!insideTag) {
      output += char
    }
  }
  return output
}
