// THIS FILE HAS TO STAY .mjs AS ITS CONSUMED BY POSTCSS
import { screens } from '../layout.mjs'

function validatePixels(pixels, device) {
  const numPixels = Number.parseFloat(pixels)

  if (Number.isNaN(numPixels)) {
    throw new Error(`Invalid pixel value: ${pixels}`)
  }
  if (screens[device].width === 0 || screens[device].height === 0) {
    throw new Error(`Screen ${device} dimensions cannot be zero`)
  }
  return numPixels
}

export const functions = {
  'mobile-vw': (pixels) => {
    const numPixels = validatePixels(pixels, 'mobile')
    return `${(numPixels * 100) / screens.mobile.width}vw`
  },
  // `clamp(MIN, VAL, MAX)` is `max(MIN, min(VAL, MAX))`. On modern mobile
  // browsers `vh >= dvh >= svh`, so `clamp(Nvh, Nsvh, Ndvh)` always collapsed
  // to `min(vh, dvh)` then `max(that, svh)` — i.e. plain `vh`, the
  // address-bar-hidden value `h-dvh` exists to avoid. Emitting `dvh` directly
  // is that same collapse (clamp(svh, vh, dvh) also always resolves to dvh
  // under that invariant), just without the misleading clamp().
  'mobile-vh': (pixels) => {
    const numPixels = validatePixels(pixels, 'mobile')
    return `${(numPixels * 100) / screens.mobile.height}dvh`
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
    return `calc((${numColumns} * var(--column-width)) + ((${numColumns} - 1) * var(--gap)))`
  },
}
