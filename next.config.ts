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
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
    reactRemoveProperties: true,
  },
  experimental: {
    reactCompiler: true,
    nextScriptWorkers: true,
    optimizePackageImports: [
      '@react-three/drei',
      '@react-three/fiber',
      'gsap',
      'three',
      'postprocessing',
      '@base-ui-components/react',
    ],
    // Enable PPR for better loading performance (when stable)
    // ppr: true,
  },
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
    // // Only cache truly static assets aggressively in production
    // ...(process.env.NODE_ENV === 'production'
    //   ? [
    //       // Next.js static assets (immutable by design)
    //       {
    //         source: '/_next/static/(.*)',
    //         headers: [
    //           {
    //             key: 'Cache-Control',
    //             value: 'public, max-age=31536000, immutable',
    //           },
    //         ],
    //       },
    //       // Public static assets
    //       {
    //         source: '/fonts/(.*)',
    //         headers: [
    //           {
    //             key: 'Cache-Control',
    //             value: 'public, max-age=31536000, immutable',
    //           },
    //         ],
    //       },
    //       {
    //         source: '/images/(.*)',
    //         headers: [
    //           {
    //             key: 'Cache-Control',
    //             value: 'public, max-age=31536000, immutable',
    //           },
    //         ],
    //       },
    //       // Other static file types in public folder
    //       {
    //         source: '/(.*)\\.{js,css,woff,woff2,ttf,otf,ico}$',
    //         headers: [
    //           {
    //             key: 'Cache-Control',
    //             value: 'public, max-age=31536000, immutable',
    //           },
    //         ],
    //       },
    //       // Images with shorter cache for CMS content
    //       {
    //         source: '/(.*)\\.{jpg,jpeg,png,gif,webp,svg,avif}$',
    //         headers: [
    //           {
    //             key: 'Cache-Control',
    //             value: 'public, max-age=3600, s-maxage=31536000',
    //           },
    //         ],
    //       },
    //     ]
    //   : []),
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
