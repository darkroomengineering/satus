export const desktopVW = (value: number, width: number) =>
  (value * width) / 1440

export const mobileVW = (value: number, width: number) => (value * width) / 375

export const twoDigits = (number: number) =>
  number > 9 ? `${number}` : `0${number}`

export function checkIsArray<T>(value: T[]): T | T[] {
  return Array.isArray(value) ? value[0] : value
}

export const convertToCamelCase = (inputString: string) => {
  return inputString.charAt(0).toLowerCase() + inputString.slice(1)
}

export const capitalizeFirstLetter = (inputString: string) => {
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

export const arraytoObject = (array: Record<string, unknown>[]) =>
  array.reduce(
    (acc: Record<string, unknown>, currentObj: Record<string, unknown>) => {
      const key = Object.keys(currentObj)[0]
      acc[key] = currentObj[key]
      return acc
    },
    {}
  )

export const shortenObjectKeys = (
  obj: { [x: string]: unknown },
  keyword: string
) => {
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

export const filterObjectKeys = (
  obj: { [x: string]: unknown },
  keyword: string
) => {
  const newObj: { [x: string]: unknown } = {}

  for (const key in obj) {
    const match = key.includes(keyword)

    if (match) {
      newObj[key] = obj[key]
    }
  }

  return newObj
}

export const iterableObject = (
  obj: { [s: string]: unknown } | ArrayLike<unknown>
) =>
  // eslint-disable-next-line no-unused-vars
  Object.entries(obj).map(([_, value]) => {
    return value
  })
