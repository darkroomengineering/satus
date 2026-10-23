import bundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

// Relative import: Next's config loader mis-resolves `@/*` aliases in
// transitively required files, so this import and everything it pulls in
// must use relative paths.
import { composeCsp, isIntegrationKept } from './lib/integrations/csp'

// Derived from the integration registry at config-eval time, so an
// integration removed by `setup:project` drops its origins with it.
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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  poweredByHeader: false,
  typedRoutes: true,
  // Stops `next dev` from appending its agent-rules block to AGENTS.md when it
  // detects an AI coding agent. AGENTS.md changes only by review. The cost:
  // agents do not get Next's pointer to the version-matched docs in
  // node_modules/next/dist/docs, so AGENTS.md has to carry what they need.
  agentRules: false,
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
  // Needs `cacheComponents`. Cost: classic prefetch (nearest `loading.tsx`, or
  // the full payload for static routes). `app/(site)/` has no `loading.tsx`
  // (it would turn 404s into 200s), so a link to a dynamic route there
  // prefetches only the layout and the click waits for the server render.
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
    // Not `inlineCss: true`. Measured 2026-09-02 (Lighthouse mobile, 3 runs,
    // localhost): FCP 905 -> 810 ms, LCP unchanged at 3.40 s, document 10 ->
    // 33 KB transfer, and the CSS also rides in every RSC payload. Re-measure
    // on a project with more render-blocking CSS.
    turbopackRustReactCompiler: true,
    sri: { algorithm: 'sha384' },
    // Not `cssChunking: 'graph'`: measured 11 stylesheets against the
    // default's 9 for identical total bytes.
    optimizePackageImports: [
      '@react-three/drei',
      '@react-three/fiber',
      'animejs',
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
    // Only hosts whose images this optimizer resizes. A host whose own CDN
    // resizes through a loader (`components/ui/image/sanity-loader.ts`)
    // stays out: the optimizer never fetches from it, and allowing it would
    // let anyone resize any image on that host here, on this project's bill.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    // 90: everything the optimizer encodes. 80: images resized by the CDN
    // loader in `components/ui/image`, which sends `quality` to the CDN, not
    // here. Next 16.3.8 only warns, in development, when a `quality` is
    // missing from this list; listing 80 keeps that warning quiet.
    qualities: [80, 90],
    // WebP only, never AVIF: AVIF decodes slower, which costs most on phones
    // and on image-heavy pages. Cost: AVIF files were smaller (40.5 KB
    // against 56.4 KB for the same 1080px photos). Images on the CDN loader
    // in `components/ui/image` skip this optimizer and come back as WebP too.
    formats: ['image/webp'],
    // Cap the largest generated variant at 2560px (Next's default tops out at
    // 3840): full-bleed art on 4K/high-DPR screens produces multi-MB
    // candidates that page-weight audits flag, with no visible gain over 2560.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Every Studio deep link (`/studio/structure/...`) renders the one
  // `/studio` page prerendered at build time. Without this, the optional
  // catch-all renders and caches each distinct path on first request, so
  // anyone could fill the route cache with year-long entries by requesting
  // made-up Studio URLs. A rewrite keeps the browser URL, which is all the
  // Studio's own router reads.
  rewrites: async () =>
    isIntegrationKept('sanity')
      ? [{ source: '/studio/:path+', destination: '/studio' }]
      : [],
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
