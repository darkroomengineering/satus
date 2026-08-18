import bundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

// Relative import — see the comment on `./lib/integrations/registry`'s own
// `@/utils/validation` import for why: Next's next.config.ts loader
// mis-resolves `@/*` aliases for transitively-required files, so both this
// import and everything it pulls in must use relative paths.
import { composeCsp } from './lib/integrations/csp'

// --- Content-Security-Policy --------------------------------------------------
// Composed at config-eval time from the integration registry (see
// lib/integrations/csp.ts for the full design rationale) — every `next
// build`/`next dev` re-derives the policy from whatever integrations are
// actually kept in this checkout, so stripping one via `setup:project` drops
// its origins automatically, with nothing to keep in sync by hand.
const CONTENT_SECURITY_POLICY = composeCsp({
  isDev: process.env.NODE_ENV === 'development',
  isVercelPreview: process.env.VERCEL_ENV === 'preview',
})
// -----------------------------------------------------------------------------

// --- Storybook proxy ---------------------------------------------------------
// Serves the standalone Storybook deployment at /storybook on this domain.
// Active ONLY when NEXT_PUBLIC_STORYBOOK_URL is set (e.g. on Preview) AND the
// environment is explicitly non-production (Vercel preview, `vercel dev`, or
// local dev) — it fails CLOSED everywhere else, including self-hosted
// production where VERCEL_ENV is undefined, so a fork never exposes a
// /storybook route by accident.
// To drop it entirely: unset the env var, or delete this block + the
// redirects/rewrites entries below.
const STORYBOOK_URL = process.env.NEXT_PUBLIC_STORYBOOK_URL?.replace(/\/+$/, '')
const STORYBOOK_PROXY_ENABLED =
  Boolean(STORYBOOK_URL) &&
  (process.env.VERCEL_ENV === 'preview' ||
    process.env.VERCEL_ENV === 'development' ||
    process.env.NODE_ENV === 'development')
// -----------------------------------------------------------------------------

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  poweredByHeader: false,
  typedRoutes: true,
  typescript: {
    // Type checking is owned by `bun run check`.
    ignoreBuildErrors: true,
  },
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
  // Shell-based prefetching: one reusable loading shell per route, cached
  // client-side and shared by every link. Requires cacheComponents: true.
  partialPrefetching: true,
  compress: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
    browserToTerminal: true,
  },
  experimental: {
    taint: true,
    // Client-side cache for previously visited routes — the one piece of the
    // instant-navigation cluster that is still opt-in (varyParams and
    // optimisticRouting are default-on).
    cachedNavigations: true,
    // Native Rust port of the React Compiler, run inside Turbopack. Pairs
    // with the top-level `reactCompiler: true`.
    turbopackRustReactCompiler: true,
    sri: { algorithm: 'sha384' },
    // Not setting `cssChunking: 'graph'`. Measured on this branch it produced
    // 11 stylesheets instead of the default's 9, for identical total bytes —
    // more requests, no saving. The default 'loose' heuristic wins here.
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
    // Cap the largest generated variant at 2560px (Next's default tops out at
    // 3840): full-bleed art on 4K/high-DPR screens produces multi-MB
    // candidates that page-weight audits flag, with no visible gain over 2560.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560],
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
          value: CONTENT_SECURITY_POLICY,
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
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

// Storybook's static build uses relative asset paths, so the entry must be
// /storybook/ (trailing slash) for them to resolve — the header links there.
// Skip Next's automatic trailing-slash redirect (preview/dev only) so
// /storybook/ is served as-is instead of being stripped to /storybook (which
// would break the relative asset URLs). No redirect rule: with skip enabled,
// a /storybook -> /storybook/ redirect matches /storybook/ too and self-loops.
if (STORYBOOK_PROXY_ENABLED) {
  nextConfig.skipTrailingSlashRedirect = true
}

const bundleAnalyzerPlugin = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default bundleAnalyzerPlugin(nextConfig)
