import { breakpoints as _breakpoints, screens } from './styles/config.mjs'

const postcss = {
  plugins: {
    'postcss-extend': {},
    'postcss-flexbugs-fixes': {},
    'postcss-preset-env': {
      stage: 0,
      autoprefixer: {
        grid: true,
      },
      features: {
        'custom-properties': false,
      },
    },
    // PostCSS Nesting is a peer dep of include-media
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
        'mobile-vw': (pixels) => `${(pixels * 100) / screens.mobile.width}vw`,
        'mobile-vh': (pixels) => `${(pixels * 100) / screens.mobile.height}svh`,
        'desktop-vw': (pixels) => `${(pixels * 100) / screens.desktop.width}vw`,
        'desktop-vh': (pixels) =>
          `${(pixels * 100) / screens.desktop.height}svh`,
        columns: (columns) =>
          `calc((${columns} * var(--layout-column-width)) + ((${columns} - 1) * var(--layout-columns-gap)))`,
      },
    },
  },
}

export default postcss
