import type { Ref } from 'react'
import { screens } from '~/styles/config'
import { easings } from './easings'

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
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
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

export function clamp(min: number, input: number, max: number) {
  return Math.max(min, Math.min(input, max))
}

export function mapRange(
  inMin: number,
  inMax: number,
  input: number,
  outMin: number,
  outMax: number,
  shouldClamp = false
) {
  const result =
    ((input - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin

  const isInverted = outMin > outMax

  if (isInverted) {
    return shouldClamp ? clamp(outMax, result, outMin) : result
  }

  return shouldClamp ? clamp(outMin, result, outMax) : result
}

export function lerp(start: number, end: number, amount: number) {
  return (1 - amount) * start + amount * end
}

export function truncate(value: number, decimals: number) {
  return Number.parseFloat(value.toFixed(decimals))
}

export function modulo(n: number, d: number) {
  if (d === 0) return n
  if (d < 0) return Number.NaN
  return ((n % d) + d) % d
}

export function stagger(
  index: number,
  total: number,
  progress: number,
  stagger: number
) {
  const start = index * stagger
  const end = 1 - (total - index) * stagger
  return clamp(0, mapRange(start, end, progress, 0, 1), 1)
}

export function ease(progress: number, ease: keyof typeof easings) {
  return easings[ease](progress)
}

export function fromTo(
  entries:
    | number
    | (number | HTMLElement | null | Element | undefined)[]
    | HTMLElement
    | Element
    | null
    | undefined,
  from: number | Record<string, number | ((index: number) => number)> = 0,
  to: number | Record<string, number | ((index: number) => number)> = 1,
  progress = 0,
  options: {
    ease?: keyof typeof easings
    stagger?: number
    render?: (
      element: HTMLElement | number | Element,
      value: Record<string, number>
    ) => void
  } = {}
) {
  if (!entries) return

  if (typeof options?.stagger === 'undefined') options.stagger = 0
  if (typeof options?.ease === 'undefined') options.ease = 'linear'

  const keys = typeof from === 'object' ? Object.keys(from) : ['value']

  const elements = Array.isArray(entries) ? entries : [entries]

  for (const [index, element] of elements.entries()) {
    const staggeredProgress = stagger(
      index,
      elements.length,
      progress,
      options.stagger!
    )

    const easedProgress = ease(staggeredProgress, options.ease!)

    const values = Object.fromEntries(
      keys.map((key) => {
        const fromPreValue = typeof from === 'object' ? from[key] : from
        const toPreValue = typeof to === 'object' ? to[key] : to

        const fromValue =
          typeof fromPreValue === 'function'
            ? fromPreValue(index)
            : fromPreValue
        const toValue =
          typeof toPreValue === 'function' ? toPreValue(index) : toPreValue

        return [key, mapRange(0, 1, easedProgress, fromValue, toValue)]
      })
    )

    if (options.render && element) options.render(element, values)
  }
}
