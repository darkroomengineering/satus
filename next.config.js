const withPlugins = require('next-compose-plugins')
const withTM = require('next-transpile-modules')([])
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withPlugins([withTM, withBundleAnalyzer], {
  reactStrictMode: true,
  experimental: { optimizeCss: true },
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
                plugins: [
                  {
                    multipass: true,
                    removeDimensions: true,
                    removeOffCanvasPaths: true,
                    reusePaths: true,
                    removeAttrs: true,
                    removeElementsByAttr: true,
                    removeStyleElement: true,
                    removeScriptElement: true,
                    prefixIds: true,
                    cleanupIDs: true,
                    cleanupNumericValues: {
                      floatPrecision: 1,
                    },
                    convertPathData: {
                      floatPrecision: 1,
                    },
                    transformsWithOnePath: {
                      floatPrecision: 1,
                    },
                    convertTransform: {
                      floatPrecision: 1,
                    },
                    cleanupListOfValues: {
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

    return config
  },
})
