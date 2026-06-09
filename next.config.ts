import bundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

// --- Storybook proxy ---------------------------------------------------------
// Serves the standalone Storybook deployment at /storybook on this domain.
// Active ONLY when NEXT_PUBLIC_STORYBOOK_URL is set (e.g. on Preview) AND the
// deployment is not Production — so production never exposes a /storybook route.
// To drop it entirely: unset the env var, or delete this block + the
// redirects/rewrites entries below.
const STORYBOOK_URL = process.env.NEXT_PUBLIC_STORYBOOK_URL?.replace(/\/+$/, '')
const STORYBOOK_PROXY_ENABLED =
  Boolean(STORYBOOK_URL) && process.env.VERCEL_ENV !== 'production'
// -----------------------------------------------------------------------------

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  poweredByHeader: false,
  productionBrowserSourceMaps:
    process.env.SOURCE_MAPS === 'true' && typeof Bun === 'undefined',
  typedRoutes: true,
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
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
    reactRemoveProperties:
      process.env.NODE_ENV === 'production'
        ? { properties: ['^data-testid$'] }
        : false,
  },
  cacheComponents: true,
  compress: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
    browserToTerminal: true,
  },
  experimental: {
    taint: true,
    cachedNavigations: true,
    prefetchInlining: true,
    sri: { algorithm: 'sha384' },
    optimizePackageImports: [
      '@react-three/drei',
      '@react-three/fiber',
      'gsap',
      'three',
      '@base-ui/react',
      'lenis',
      'zustand',
      '@sanity/client',
      '@sanity/image-url',
      '@sanity/asset-utils',
      '@portabletext/react',
    ],
  },
  devIndicators: false,
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    qualities: [90],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
          value: "frame-ancestors 'self' https://*.sanity.studio;",
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on',
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ],
  // Storybook's static build uses relative asset paths, so the entry must be
  // /storybook/ (trailing slash) for them to resolve — the header links there.
  // Skip Next's automatic trailing-slash redirect (preview/dev only) so
  // /storybook/ is served as-is instead of being stripped to /storybook (which
  // would break the relative asset URLs). No redirect rule: with skip enabled,
  // a /storybook -> /storybook/ redirect matches /storybook/ too and self-loops.
  ...(STORYBOOK_PROXY_ENABLED ? { skipTrailingSlashRedirect: true } : {}),
  rewrites: async () =>
    STORYBOOK_PROXY_ENABLED
      ? [
          { source: '/storybook/', destination: `${STORYBOOK_URL}/` },
          {
            source: '/storybook/:path*',
            destination: `${STORYBOOK_URL}/:path*`,
          },
        ]
      : [],
}

const bundleAnalyzerPlugin = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default bundleAnalyzerPlugin(nextConfig)
