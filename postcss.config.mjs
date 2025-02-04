import { breakpoints } from './styles/config.mjs'
import { functions } from './styles/functions.mjs'

/**
 * @type {import('postcss-preset-env').pluginOptions}
 */
const presetEnvConfig = {
  autoprefixer: {
    flexbox: 'no-2009',
  },
  stage: 3,
  features: {
    'custom-properties': false,
  },
}

/**
 * @type {import('postcss-include-media').IncludeMediaOptions}
 */
const includeMediaConfig = {
  breakpoints: {
    dt: `${breakpoints.dt}px`,
  },
  mediaExpressions: {
    hover: '(hover: hover)',
    mobile: `(max-width: ${breakpoints.dt - 1}px)`,
    desktop: `(min-width: ${breakpoints.dt}px)`,
    'reduced-motion': '(prefers-reduced-motion: reduce)',
  },
}

const emptyConfig = {}

const postcssConfig = {
  plugins: {
    '@tailwindcss/postcss': emptyConfig,
    'postcss-extend-rule': emptyConfig,
    'postcss-preset-env': presetEnvConfig,
    'postcss-nesting': emptyConfig,
    'postcss-include-media': includeMediaConfig,
    'postcss-functions': { functions },
    cssnano: process.env.NODE_ENV === 'production' ? emptyConfig : false,
  },
}

export default postcssConfig
