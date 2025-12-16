/**
 * String & Object Utilities
 *
 * Helper functions for string manipulation, object operations, and refs.
 */

import type { Ref } from 'react'

// =============================================================================
// STRING UTILITIES
// =============================================================================

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

export function convertToCamelCase(inputString: string) {
  return inputString.charAt(0).toLowerCase() + inputString.slice(1)
}

export function capitalizeFirstLetter(inputString: string) {
  return inputString.charAt(0).toUpperCase() + inputString.slice(1)
}

export function twoDigits(number: number) {
  return number > 9 ? `${number}` : `0${number}`
}

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

export function isEmptyObject(obj: Record<string, unknown>) {
  if (!obj) return true
  return Object.keys(obj).length === 0
}

export function isEmptyArray(arr: string | unknown[]) {
  if (!arr) return true
  return Array.isArray(arr) && arr.length === 0
}

export function arraytoObject(array: Record<string, unknown>[]) {
  return array.reduce((acc, currentObj) => {
    const key = Object.keys(currentObj)[0]
    acc[key] = currentObj[key]
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

    if (match) {
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
