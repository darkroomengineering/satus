import { screens } from './config.mjs'

/**
 * Validate the pixel value and return the number of pixels
 * @param {string} pixels - The pixel value to validate
 * @param {string} dimension - The dimension to validate against
 * @returns {number} The number of pixels
 */
function validatePixels(pixels, dimension) {
  const numPixels = Number.parseFloat(pixels)
  if (Number.isNaN(numPixels)) {
    throw new Error(`Invalid pixel value: ${pixels}`)
  }
  if (screens[dimension].width === 0 || screens[dimension].height === 0) {
    throw new Error(`Screen ${dimension} dimensions cannot be zero`)
  }
  return numPixels
}

export const functions = {
  'mobile-vw': (pixels) => {
    const numPixels = validatePixels(pixels, 'mobile')
    return `${(numPixels * 100) / screens.mobile.width}vw`
  },
  'mobile-vh': (pixels) => {
    const numPixels = validatePixels(pixels, 'mobile')
    const vh = `${(numPixels * 100) / screens.mobile.height}`
    return `clamp(${vh}vh, ${vh}svh, ${vh}dvh)`
  },
  'desktop-vw': (pixels) => {
    const numPixels = validatePixels(pixels, 'desktop')
    return `${(numPixels * 100) / screens.desktop.width}vw`
  },
  'desktop-vh': (pixels) => {
    const numPixels = validatePixels(pixels, 'desktop')
    return `${(numPixels * 100) / screens.desktop.height}svh`
  },
  columns: (columns) => {
    const numColumns = Number.parseFloat(columns)
    if (Number.isNaN(numColumns)) {
      throw new Error(`Invalid column value: ${columns}`)
    }
    return `calc((${numColumns} * var(--layout-column-width)) + ((${numColumns} - 1) * var(--layout-columns-gap)))`
  },
}
