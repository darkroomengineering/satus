import { functions } from './styles/scripts/postcss-functions.mjs'

/**
 * PostCSS preset-env config
 * @see Docs {@link https://github.com/csstools/postcss-plugins/blob/main/plugin-packs/postcss-preset-env/README.md#options}
 * @see Features Flags {@link https://github.com/csstools/postcss-plugins/blob/main/plugin-packs/postcss-preset-env/FEATURES.md}
 * @type {import('postcss-preset-env').pluginOptions}
 */
const presetEnvConfig = {
  autoprefixer: {
    flexbox: 'no-2009',
  },
  stage: 3,
  features: {
    'custom-properties': false,
    'custom-media-queries': true,
    'nesting-rules': true,
  },
}

/**
 * PostCSS global data config
 * Makes sure the css module files have access to these context files
 * @see {@link https://github.com/csstools/postcss-global-data?tab=readme-ov-file#options}
 * @type {import('@csstools/postcss-global-data').pluginOptions}
 */
const globalDataConfig = {
  files: ['./styles/css/root.css'],
}

const postcssConfig = {
  // NOTE: Order is important
  plugins: {
    '@tailwindcss/postcss': {},
    '@csstools/postcss-global-data': globalDataConfig,
    'postcss-functions': { functions },
    // NOTE: This has to be last config
    'postcss-preset-env': presetEnvConfig,
  },
}

export default postcssConfig
