import type { Ref } from 'react'
import { screens } from '~/styles/config'

export function desktopVW(value: number, width: number) {
  return (value * width) / screens.desktop.width
}

export function mobileVW(value: number, width: number) {
  return (value * width) / screens.mobile.width
}

export function twoDigits(number: number) {
  return number > 9 ? `${number}` : `0${number}`
}

export function checkIsArray<T>(value: T): T extends unknown[] ? T[0] : T {
  return (Array.isArray(value) ? value[0] : value) as T extends unknown[]
    ? T[0]
    : T
}

export function convertToCamelCase(inputString: string) {
  return inputString.charAt(0).toLowerCase() + inputString.slice(1)
}

export function capitalizeFirstLetter(inputString: string) {
  return inputString.charAt(0).toUpperCase() + inputString.slice(1)
}

export function numberWithCommas(x: { toString: () => string }) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
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

export function slugify(text: { toString: () => string }) {
  return text
    .toString() // Cast to string (optional)
    .normalize('NFKD') // The normalize() using NFKD method returns the Unicode Normalization Form of a given string.
    .toLowerCase() // Convert the string to lowercase letters
    .trim() // Remove whitespace from both sides of a string (optional)
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
}

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
