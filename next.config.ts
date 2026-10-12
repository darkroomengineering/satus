import bundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

// Relative import — see the comment on `./lib/integrations/registry`'s own
// `@/utils/validation` import for why: Next's next.config.ts loader
// mis-resolves `@/*` aliases for transitively-required files, so both this
// import and everything it pulls in must use relative paths.
import { composeCsp, isIntegrationKept } from './lib/integrations/csp'

// --- Content-Security-Policy --------------------------------------------------
// Composed at config-eval time from the integration registry (see
// lib/integrations/csp.ts for the full design rationale) — every `next
// build`/`next dev` re-derives the policy from whatever integrations are
// actually kept in this checkout, so stripping one via `setup:project` drops
// its origins automatically, with nothing to keep in sync by hand.
const CSP_OPTIONS = {
  isDev: process.env.NODE_ENV === 'development',
  isVercelPreview: process.env.VERCEL_ENV === 'preview',
}
const CONTENT_SECURITY_POLICY = composeCsp(CSP_OPTIONS)
// The embedded Sanity Studio loads its bridge script, fonts and avatars from
// Sanity's hosts. Its own policy keeps those origins off every site route.
const STUDIO_CONTENT_SECURITY_POLICY = composeCsp({
  ...CSP_OPTIONS,
  isStudio: true,
})
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
  // Off: pages are static or ISR, data is cached per fetch with tags, and
  // `revalidateTag` from `/api/revalidate` refreshes it. Cost: no Partial
  // Prerendering, so a route that reads cookies, headers or searchParams
  // renders fully on the server per request instead of streaming into a
  // prerendered shell.
  cacheComponents: false,
  // Off because it needs `cacheComponents: true`. Cost: links prefetch the
  // classic way (the nearest `loading.tsx` for dynamic routes, the full
  // payload for static ones) instead of one shared loading shell per route.
  // `app/(site)/` has no `loading.tsx` (it would turn 404s into 200s, see
  // app/README.md), so a link to a dynamic route there prefetches only the
  // shared layout and the click waits for the server render.
  partialPrefetching: false,
  compress: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
    browserToTerminal: true,
  },
  experimental: {
    taint: true,
    // Off because it needs `cacheComponents: true`. Cost: going back to a
    // visited route refetches its dynamic data instead of reusing a
    // client-side copy.
    cachedNavigations: false,
    // Not setting `inlineCss: true`. Measured 2026-09-02 (Lighthouse mobile,
    // 3 runs each, localhost build): FCP 905 -> 810 ms, LCP 3.40 -> 3.40 s,
    // TBT and CLS unchanged. It removed 4 stylesheets (14 KB transfer) but
    // grew the document from 10 to 33 KB transfer (45 -> 176 KB raw), and
    // that CSS also rides in every RSC payload. A 100 ms first-paint gain
    // for +9 KB on the wire and no LCP movement is not worth it here; the
    // starter's LCP is the throttled shell floor, not CSS delivery. A client
    // project with more render-blocking CSS should re-measure.
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
    // No `cdn.sanity.io`: Sanity's CDN resizes its own images through the
    // loader in `components/ui/image`, so the optimizer never fetches them.
    // Allowing the host would let anyone resize any Sanity project's images
    // here, on this project's bill.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    // 80: `SanityImage` (its loader still passes the check); 90: everything else.
    qualities: [80, 90],
    // WebP only, never AVIF: AVIF decodes slower, which costs most on phones
    // and on image-heavy pages. Cost: AVIF files were smaller (40.5 KB
    // against 56.4 KB for the same 1080px photos). Sanity images skip this
    // optimizer: Sanity's CDN resizes them, also as WebP (`components/ui/image`).
    formats: ['image/webp'],
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
          // No `includeSubDomains; preload`: preload can lock every subdomain
          // of a client's domain to HTTPS, and leaving the list takes months.
          // Add them only once the client owns that decision.
          value: 'max-age=63072000',
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
    // Last, so it overrides the site-wide CSP: when two rules set the same
    // header on a path, Next sends the later one.
    ...(isIntegrationKept('sanity')
      ? [
          {
            source: '/studio/:path*',
            headers: [
              {
                key: 'Content-Security-Policy',
                value: STUDIO_CONTENT_SECURITY_POLICY,
              },
            ],
          },
        ]
      : []),
  ],
}

const bundleAnalyzerPlugin = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default bundleAnalyzerPlugin(nextConfig)
