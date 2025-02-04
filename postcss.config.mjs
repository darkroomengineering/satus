import { breakpoints } from './styles/layout.mjs'
import { functions } from './styles/scripts/postcss-functions.mjs'

/* Placeholder config for plugins that don't need any config */
const emptyConfig = {}

/**
 * PostCSS preset-env config
 * @see {@link https://github.com/csstools/postcss-plugins/blob/main/plugin-packs/postcss-preset-env/README.md#options}
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
 * PostCSS include-media config
 * @see {@link https://github.com/jackmcpickle/postcss-include-media?tab=readme-ov-file#Options}
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

/**
 * PostCSS functions config
 * @see {@link https://github.com/andyjansson/postcss-functions?tab=readme-ov-file#options}
 * @type {import('postcss-functions').Options}
 */
const functionsConfig = {
  functions,
}

/**
 * CSSnano config
 * @see {@link https://cssnano.github.io/cssnano/docs/config-file/}
 * @type {import('cssnano').Options}
 */
const cssnanoConfig =
  process.env.NODE_ENV === 'production'
    ? {
        preset: 'default',
      }
    : false

const postcssConfig = {
  plugins: {
    '@tailwindcss/postcss': emptyConfig,
    'postcss-extend-rule': emptyConfig,
    'postcss-preset-env': presetEnvConfig,
    'postcss-nesting': emptyConfig,
    'postcss-include-media': includeMediaConfig,
    'postcss-functions': functionsConfig,
    cssnano: cssnanoConfig,
  },
}

export default postcssConfig
