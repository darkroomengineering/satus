/**
 * Unit tests for string utilities
 *
 * Run with: bun test lib/utils/strings.test.ts
 */

import { describe, expect, it } from 'bun:test'
import {
  capitalizeFirstLetter,
  isEmptyArray,
  lowerFirstChar,
  slugify,
  stripHtmlTags,
} from './strings'

describe('slugify', () => {
  it('should convert text to URL-friendly format', () => {
    expect(slugify('Hello World')).toBe('hello-world')
    expect(slugify('Hello World!')).toBe('hello-world')
  })

  it('should handle special characters', () => {
    expect(slugify('Café & Restaurant')).toBe('cafe-restaurant')
    expect(slugify('Rock & Roll')).toBe('rock-roll')
  })

  it('should handle multiple spaces and dashes', () => {
    expect(slugify('Hello   World')).toBe('hello-world')
    expect(slugify('Hello--World')).toBe('hello-world')
    expect(slugify('Hello - World')).toBe('hello-world')
  })

  it('should trim whitespace', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world')
  })

  it('should handle numbers', () => {
    expect(slugify('Product 123')).toBe('product-123')
    expect(slugify('2024 Review')).toBe('2024-review')
  })

  it('should handle objects with toString', () => {
    const obj = { toString: () => 'Custom Object' }
    expect(slugify(obj)).toBe('custom-object')
  })
})

describe('lowerFirstChar', () => {
  it('should lowercase the first character', () => {
    expect(lowerFirstChar('HelloWorld')).toBe('helloWorld')
    expect(lowerFirstChar('MyComponent')).toBe('myComponent')
  })

  it('should leave already-lowercase first character unchanged', () => {
    expect(lowerFirstChar('helloWorld')).toBe('helloWorld')
  })

  it('should handle single characters', () => {
    expect(lowerFirstChar('A')).toBe('a')
    expect(lowerFirstChar('a')).toBe('a')
  })

  it('should handle empty strings', () => {
    expect(lowerFirstChar('')).toBe('')
  })
})

describe('capitalizeFirstLetter', () => {
  it('should capitalize the first letter', () => {
    expect(capitalizeFirstLetter('hello')).toBe('Hello')
    expect(capitalizeFirstLetter('world')).toBe('World')
  })

  it('should handle already capitalized strings', () => {
    expect(capitalizeFirstLetter('Hello')).toBe('Hello')
  })

  it('should handle single characters', () => {
    expect(capitalizeFirstLetter('a')).toBe('A')
    expect(capitalizeFirstLetter('A')).toBe('A')
  })

  it('should handle empty strings', () => {
    expect(capitalizeFirstLetter('')).toBe('')
  })
})

describe('isEmptyArray', () => {
  it('should return true for empty arrays', () => {
    expect(isEmptyArray([])).toBe(true)
  })

  it('should return false for non-empty arrays', () => {
    expect(isEmptyArray([1, 2, 3])).toBe(false)
    expect(isEmptyArray(['a'])).toBe(false)
  })

  it('should return false for non-arrays (strings)', () => {
    // Note: strings are not arrays, so Array.isArray returns false
    // The function returns false for non-arrays that have a truthy value
    expect(isEmptyArray('test')).toBe(false)
  })

  it('should return true for null/undefined', () => {
    expect(isEmptyArray(null as unknown as unknown[])).toBe(true)
    expect(isEmptyArray(undefined as unknown as unknown[])).toBe(true)
  })
})

describe('stripHtmlTags', () => {
  it('removes simple and nested tags', () => {
    expect(stripHtmlTags('<p>Hello</p>')).toBe('Hello')
    expect(stripHtmlTags('I agree to the <a href="/x">terms</a>')).toBe(
      'I agree to the terms'
    )
  })

  it('drops an unterminated tag without leaving <script', () => {
    const result = stripHtmlTags('safe <script')
    expect(result).toBe('safe ')
    expect(result).not.toContain('<script')
  })

  it('cannot reassemble a tag from the remainder', () => {
    expect(stripHtmlTags('<scr<script>ipt>')).not.toContain('<')
  })

  it('leaves plain text untouched', () => {
    expect(stripHtmlTags('No tags here')).toBe('No tags here')
    expect(stripHtmlTags('')).toBe('')
  })
})
