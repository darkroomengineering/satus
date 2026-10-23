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
