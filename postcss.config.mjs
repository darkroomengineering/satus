import { breakpoints as _breakpoints, screens } from './styles/config.mjs'

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
          const numPixels = Number.parseFloat(pixels)
          if (Number.isNaN(numPixels)) {
            throw new Error(`Invalid pixel value: ${pixels}`)
          }
          return `${(numPixels * 100) / screens.mobile.width}vw`
        },
        'mobile-vh': (pixels) => {
          const numPixels = Number.parseFloat(pixels)
          if (Number.isNaN(numPixels)) {
            throw new Error(`Invalid pixel value: ${pixels}`)
          }
          return `${(numPixels * 100) / screens.mobile.height}svh`
        },
        'desktop-vw': (pixels) => {
          const numPixels = Number.parseFloat(pixels)
          if (Number.isNaN(numPixels)) {
            throw new Error(`Invalid pixel value: ${pixels}`)
          }
          return `${(numPixels * 100) / screens.desktop.width}vw`
        },
        'desktop-vh': (pixels) => {
          const numPixels = Number.parseFloat(pixels)
          if (Number.isNaN(numPixels)) {
            throw new Error(`Invalid pixel value: ${pixels}`)
          }
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
  },
}

export default postcss
