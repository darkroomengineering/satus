import bundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      '*.svg': {
        loaders: [
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
        as: '*.js',
      },
    },
  },
  experimental: {
    reactCompiler: true,
    nextScriptWorkers: true,
    optimizePackageImports: ['@react-three/drei', '@react-three/fiber', 'gsap'],
  },
  // modularizeImports: {
  //   '@react-three/drei': {
  //     transform: '@react-three/drei/{{member}}',
  //   },
  //   gsap: {
  //     transform: 'gsap/{{member}}',
  //   },
  // },
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'a-us.storyblok.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.darkroom.engineering',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // webpack: (config) => {
  //   config.module.rules.push({
  //     test: /\.svg$/,
  //     use: [
  //       {
  //         loader: '@svgr/webpack',
  //         options: {
  //           memo: true,
  //           dimensions: false,
  //           svgoConfig: {
  //             multipass: true,
  //             plugins: [
  //               'removeDimensions',
  //               'removeOffCanvasPaths',
  //               'reusePaths',
  //               'removeElementsByAttr',
  //               'removeStyleElement',
  //               'removeScriptElement',
  //               'prefixIds',
  //               'cleanupIds',
  //               {
  //                 name: 'cleanupNumericValues',
  //                 params: {
  //                   floatPrecision: 1,
  //                 },
  //               },
  //               {
  //                 name: 'convertPathData',
  //                 params: {
  //                   floatPrecision: 1,
  //                 },
  //               },
  //               {
  //                 name: 'convertTransform',
  //                 params: {
  //                   floatPrecision: 1,
  //                 },
  //               },
  //               {
  //                 name: 'cleanupListOfValues',
  //                 params: {
  //                   floatPrecision: 1,
  //                 },
  //               },
  //             ],
  //           },
  //         },
  //       },
  //     ],
  //   })

  //   return config
  // },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Content-Security-Policy',
          value: "frame-ancestors 'self' https://app.storyblok.com/",
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
  ],
  redirects: async () => [
    {
      source: '/home',
      destination: '/',
      permanent: true,
    },
  ],
  rewrites: async () => [
    {
      source: '/',
      destination: '/home',
    },
  ],
}

const bundleAnalyzerPlugin = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const NextApp = () => {
  const plugins = [bundleAnalyzerPlugin]
  return plugins.reduce((config, plugin) => plugin(config), nextConfig)
}

export default NextApp
