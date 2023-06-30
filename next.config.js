const runtimeCaching = require('next-pwa/cache')
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest.json$/],
  maximumFileSizeToCacheInBytes: 4000000,
})
const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
const path = require('path')
const sassUtils = require(__dirname + '/libs/sass-utils')
const sassVars = require(__dirname + '/config/variables.js')

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@studio-freight/compono'],
  experimental: {
    optimizeCss: true,
    legacyBrowsers: false,
    // storyblok prewiew
    nextScriptWorkers: process.env.NODE_ENV !== 'development',
    urlImports: ['https://cdn.skypack.dev', 'https://unpkg.com'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV !== 'development',
  },
  images: {
    // ADD in case you need to import SVGs in next/image component
    // dangerouslyAllowSVG: true,
    // contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: ['assets.studiofreight.com'],
    formats: ['image/avif', 'image/webp'],
  },
  sassOptions: {
    // add @import 'styles/_functions'; to all scss files.
    includePaths: [path.join(__dirname, 'styles')],
    prependData: `@import 'styles/_functions';`,
    functions: {
      'get($keys)': function (keys) {
        keys = keys.getValue().split('.')
        let result = sassVars
        for (let i = 0; i < keys.length; i++) {
          result = result[keys[i]]
        }
        result = sassUtils.castToSass(result)

        return result
      },
      'getColors()': function () {
        return sassUtils.castToSass(sassVars.colors)
      },
      'getThemes()': function () {
        return sassUtils.castToSass(sassVars.themes)
      },
    },
  },
  webpack: (config, options) => {
    const { dir } = options

    config.module.rules.push(
      {
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              memo: true,
              dimensions: false,
              svgoConfig: {
                multipass: true,
                plugins: [
                  'removeDimensions',
                  'removeOffCanvasPaths',
                  'reusePaths',
                  'removeElementsByAttr',
                  'removeStyleElement',
                  'removeScriptElement',
                  'prefixIds',
                  'cleanupIds',
                  {
                    name: 'cleanupNumericValues',
                    params: {
                      floatPrecision: 1,
                    },
                  },
                  {
                    name: 'convertPathData',
                    params: {
                      floatPrecision: 1,
                    },
                  },
                  {
                    name: 'convertTransform',
                    params: {
                      floatPrecision: 1,
                    },
                  },
                  {
                    name: 'cleanupListOfValues',
                    params: {
                      floatPrecision: 1,
                    },
                  },
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.(graphql|gql)$/,
        include: [dir],
        exclude: /node_modules/,
        use: [
          {
            loader: 'graphql-tag/loader',
          },
        ],
      }
    )

    config.plugins.push(new DuplicatePackageCheckerPlugin())

    return config
  },
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
  redirects: async () => {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

module.exports = () => {
  const plugins = [withPWA, withBundleAnalyzer]
  return plugins.reduce((acc, plugin) => plugin(acc), {
    ...nextConfig,
  })
}
