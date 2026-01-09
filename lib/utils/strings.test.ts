/**
 * Unit tests for string utilities
 *
 * Run with: bun test lib/utils/strings.test.ts
 */

import { describe, expect, it } from 'bun:test'
import {
  capitalizeFirstLetter,
  convertToCamelCase,
  isEmptyArray,
  isEmptyObject,
  numberWithCommas,
  slugify,
  twoDigits,
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

describe('convertToCamelCase', () => {
  it('should convert first character to lowercase', () => {
    expect(convertToCamelCase('HelloWorld')).toBe('helloWorld')
    expect(convertToCamelCase('MyComponent')).toBe('myComponent')
  })

  it('should handle already camelCase strings', () => {
    expect(convertToCamelCase('helloWorld')).toBe('helloWorld')
  })

  it('should handle single characters', () => {
    expect(convertToCamelCase('A')).toBe('a')
    expect(convertToCamelCase('a')).toBe('a')
  })

  it('should handle empty strings', () => {
    expect(convertToCamelCase('')).toBe('')
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

describe('twoDigits', () => {
  it('should pad single digit numbers with zero', () => {
    expect(twoDigits(0)).toBe('00')
    expect(twoDigits(5)).toBe('05')
    expect(twoDigits(9)).toBe('09')
  })

  it('should not pad two-digit numbers', () => {
    expect(twoDigits(10)).toBe('10')
    expect(twoDigits(23)).toBe('23')
    expect(twoDigits(99)).toBe('99')
  })

  it('should handle numbers greater than 99', () => {
    expect(twoDigits(100)).toBe('100')
    expect(twoDigits(999)).toBe('999')
  })
})

describe('numberWithCommas', () => {
  it('should add commas as thousands separators', () => {
    expect(numberWithCommas(1000)).toBe('1,000')
    expect(numberWithCommas(1234)).toBe('1,234')
    expect(numberWithCommas(1234567)).toBe('1,234,567')
  })

  it('should not add commas to numbers less than 1000', () => {
    expect(numberWithCommas(999)).toBe('999')
    expect(numberWithCommas(1)).toBe('1')
    expect(numberWithCommas(0)).toBe('0')
  })

  it('should handle objects with toString', () => {
    const obj = { toString: () => '1234567' }
    expect(numberWithCommas(obj)).toBe('1,234,567')
  })
})

describe('isEmptyObject', () => {
  it('should return true for empty objects', () => {
    expect(isEmptyObject({})).toBe(true)
  })

  it('should return false for non-empty objects', () => {
    expect(isEmptyObject({ a: 1 })).toBe(false)
    expect(isEmptyObject({ key: 'value' })).toBe(false)
  })

  it('should return true for null/undefined', () => {
    expect(isEmptyObject(null as unknown as Record<string, unknown>)).toBe(true)
    expect(isEmptyObject(undefined as unknown as Record<string, unknown>)).toBe(
      true
    )
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
