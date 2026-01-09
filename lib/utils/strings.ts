/**
 * String & Object Utilities
 *
 * Helper functions for string manipulation, object operations, and refs.
 */

import type { Ref } from 'react'

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
 * Converts first character to lowercase (camelCase format).
 *
 * @param inputString - String to convert
 * @returns String with lowercase first character
 *
 * @example
 * ```ts
 * convertToCamelCase('HelloWorld') // 'helloWorld'
 * ```
 */
export function convertToCamelCase(inputString: string) {
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

/**
 * Formats a number as a two-digit string (padding with zero).
 *
 * @param number - Number to format
 * @returns Two-digit string representation
 *
 * @example
 * ```ts
 * twoDigits(5)  // '05'
 * twoDigits(23) // '23'
 * ```
 */
export function twoDigits(number: number) {
  return number > 9 ? `${number}` : `0${number}`
}

/**
 * Adds commas as thousands separators to numbers.
 *
 * @param x - Number to format (must have toString method)
 * @returns String with comma separators
 *
 * @example
 * ```ts
 * numberWithCommas(1234)     // '1,234'
 * numberWithCommas(1234567)  // '1,234,567'
 * ```
 */
export function numberWithCommas(x: { toString: () => string }) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// =============================================================================
// ARRAY & OBJECT UTILITIES
// =============================================================================

export function checkIsArray<T>(value: T): T extends unknown[] ? T[0] : T {
  return (Array.isArray(value) ? value[0] : value) as T extends unknown[]
    ? T[0]
    : T
}

/**
 * Checks if an object is empty (has no enumerable properties).
 *
 * @param obj - Object to check
 * @returns True if object is empty or null/undefined
 *
 * @example
 * ```ts
 * isEmptyObject({})        // true
 * isEmptyObject({ a: 1 })  // false
 * isEmptyObject(null)      // true
 * ```
 */
export function isEmptyObject(obj: Record<string, unknown>) {
  if (!obj) return true
  return Object.keys(obj).length === 0
}

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

export function arraytoObject(array: Record<string, unknown>[]) {
  return array.reduce((acc: Record<string, unknown>, currentObj) => {
    const key = Object.keys(currentObj)[0]
    if (key !== undefined) {
      acc[key] = currentObj[key]
    }
    return acc
  }, {})
}

export function shortenObjectKeys(
  obj: Record<string, unknown>,
  keyword: string
) {
  const regex = new RegExp(`[^]+${keyword}(.*)`)

  for (const key in obj) {
    const match = key.match(regex)

    if (match?.[1]) {
      const newKey = convertToCamelCase(match[1])
      obj[newKey] = obj[key]
      delete obj[key]
    }
  }

  return obj
}

export function filterObjectKeys(
  obj: { [x: string]: unknown },
  keyword: string
) {
  const newObj: { [x: string]: unknown } = {}

  for (const key in obj) {
    const match = key.includes(keyword)

    if (match) {
      newObj[key] = obj[key]
    }
  }

  return newObj
}

export function iterableObject(
  obj: { [s: string]: unknown } | ArrayLike<unknown>
) {
  return Object.entries(obj).map(([, value]) => {
    return value
  })
}

// =============================================================================
// REF UTILITIES
// =============================================================================

/**
 * Merges multiple React refs into a single ref callback.
 *
 * Useful when you need to assign multiple refs to the same element,
 * such as combining a local ref with a forwarded ref.
 *
 * @param refs - Refs to merge (functions and ref objects supported)
 * @returns A ref callback that updates all provided refs
 *
 * @example
 * ```tsx
 * // Component that needs both local and forwarded ref
 * function MyComponent({ ref }: { ref: React.Ref<HTMLDivElement> }) {
 *   const localRef = useRef<HTMLDivElement>(null)
 *   const mergedRef = mergeRefs(localRef, ref)
 *
 *   return <div ref={mergedRef}>Content</div>
 * }
 *
 * // Forward ref pattern
 * const ForwardedComponent = forwardRef(MyComponent)
 * ```
 */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): Ref<T> {
  return (value) => {
    const cleanups = refs.reduce<VoidFunction[]>((accumulator, ref) => {
      if (typeof ref === 'function') {
        const cleanup = ref(value)
        if (typeof cleanup === 'function') {
          accumulator.push(cleanup)
        }
      } else if (ref) {
        ref.current = value
      }

      return accumulator
    }, [])

    return () => {
      for (const cleanup of cleanups) cleanup()
    }
  }
}
