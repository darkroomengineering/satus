import { breakpoints as _breakpoints, screens } from './styles/config.mjs'

const validatePixels = (pixels, dimension) => {
  const numPixels = Number.parseFloat(pixels)
  if (Number.isNaN(numPixels)) {
    throw new Error(`Invalid pixel value: ${pixels}`)
  }
  if (screens[dimension].width === 0 || screens[dimension].height === 0) {
    throw new Error(`Screen ${dimension} dimensions cannot be zero`)
  }
  return numPixels
}

const postcss = {
  plugins: {
    'postcss-import': {},
    'postcss-extend': {},
    'postcss-flexbugs-fixes': {},
    'postcss-preset-env': {
      autoprefixer: {
        flexbox: 'no-2009',
      },
      stage: 3,
      features: {
        'custom-properties': false,
      },
    },
    'postcss-nesting': {},
    'postcss-include-media': {
      breakpoints: {
        dt: `${_breakpoints.dt}px`,
      },
      mediaExpressions: {
        hover: '(hover: hover)',
        mobile: `(max-width: ${_breakpoints.dt - 1}px)`,
        desktop: `(min-width: ${_breakpoints.dt}px)`,
        'reduced-motion': '(prefers-reduced-motion: reduce)',
      },
    },
    'postcss-functions': {
      functions: {
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
      },
    },
    'postcss-sort-media-queries': {},
    'postcss-combine-duplicated-selectors': {},
    cssnano: process.env.NODE_ENV === 'production' ? {} : false,
  },
}

export default postcss
