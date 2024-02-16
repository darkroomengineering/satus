export const desktopVW = (value, width) => (value * width) / 1440

export const mobileVW = (value, width) => (value * width) / 375

export const twoDigits = (number) => (number > 9 ? `${number}` : `0${number}`)

export function checkIsArray(value) {
  return Array.isArray(value) ? value[0] : value
}

export const convertToCamelCase = (inputString) => {
  return inputString.charAt(0).toLowerCase() + inputString.slice(1)
}

export const capitalizeFirstLetter = (inputString) => {
  return inputString.charAt(0).toUpperCase() + inputString.slice(1)
}

export function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function isEmptyObject(obj) {
  if (!obj) return true

  return Object.keys(obj).length === 0
}

export function isEmptyArray(arr) {
  if (!arr) return true

  return Array.isArray(arr) && arr.length === 0
}

export const arraytoObject = (array) =>
  array.reduce((acc, currentObj) => {
    const key = Object.keys(currentObj)[0]
    acc[key] = currentObj[key]
    return acc
  }, {})

export const shortenObjectKeys = (obj, keyword) => {
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

export const filterObjectKeys = (obj, keyword) => {
  let newObj = {}

  for (const key in obj) {
    const match = key.includes(keyword)

    if (match) {
      newObj[key] = obj[key]
    }
  }

  return newObj
}

export const iterableObject = (obj) =>
  // eslint-disable-next-line no-unused-vars
  Object.entries(obj).map(([_, value]) => {
    return value
  })
