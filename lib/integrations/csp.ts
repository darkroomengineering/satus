/**
 * Content-Security-Policy composer. `next.config.ts` calls `composeCsp()` at
 * config-eval time: once for the site, once with `isStudio` for `/studio/*`.
 *
 * Composition is a pure function rather than a literal policy string written
 * by a `setup:project` AST transform, so stripping an integration folder
 * drops its origins on the next build with nothing to keep in sync.
 *
 * Enforced, not Report-Only. Without a nonce pipeline (a `proxy.ts` plus
 * per-request headers change), `script-src` still needs `'unsafe-inline'`
 * (and `'unsafe-eval'` in dev for React Refresh), so an injected `<script>`
 * is not blocked. `connect-src`, `img-src` and `frame-ancestors` are limited
 * to the origins the kept integrations load.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type CspDirective,
  type CspSources,
  type IntegrationEntry,
  type IntegrationId,
  integrations,
} from './registry'

/**
 * Extra CSP origins the registry can't know about: a custom API, a
 * third-party embed added after setup, a HubSpot portal's own
 * submission/tracking origin (see the `hubspot` entry in `./registry`).
 * Merged into every environment; scope one to a single environment inside
 * `composeCsp`.
 */
export const PROJECT_CSP_EXTRA_SOURCES: CspSources = {}

// Resolved from import.meta.url, not process.cwd(), so it holds wherever
// `next build`/`next dev` was invoked from.
const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url))

/**
 * Ids with no removable bundle in `lib/scripts/integration-bundles.ts`
 * (gated by env vars at runtime, not file presence), so their CSP origins
 * are always composed in.
 */
const NEVER_STRIPPED: ReadonlySet<IntegrationId> = new Set([
  'turnstile',
  'analytics',
])

/**
 * True when `id`'s integration code is present in this checkout.
 * `setup:project` strips an integration by deleting its whole
 * `lib/integrations/<id>` folder, so folder existence is the signal. It does
 * not import `lib/scripts/integration-bundles.ts`, to keep setup tooling out
 * of next.config.ts's eval path.
 *
 * Deliberately not `isConfigured(id)`: code can be kept before credentials
 * are filled in (CI or preview builds), and the policy must already allow
 * the origin when they land. The header moves with the codebase, not env
 * vars.
 */
export function isIntegrationKept(id: IntegrationId): boolean {
  if (NEVER_STRIPPED.has(id)) return true
  return existsSync(join(PROJECT_ROOT, 'lib/integrations', id))
}

/** Union `sources` per directive, de-duplicating and preserving first-seen order. */
function mergeSources(...sources: CspSources[]): CspSources {
  const merged: CspSources = {}
  for (const source of sources) {
    // SAFETY: `source` is always a `CspSources` value, so every entry
    // `Object.entries` produces has a `CspDirective` key and a `string[]`
    // value — `Object.entries` itself only knows the generic `string` key
    // type.
    for (const [directive, values] of Object.entries(source) as [
      CspDirective,
      string[],
    ][]) {
      merged[directive] = [
        ...new Set([...(merged[directive] ?? []), ...values]),
      ]
    }
  }
  return merged
}

/**
 * Origins the embedded Sanity Studio loads beyond the site policy. Served
 * only on `/studio/*` (second CSP rule in `next.config.ts`), so the site
 * policy stays narrow.
 */
const STUDIO_SOURCES: CspSources = {
  // Presentation's comlink bridge, injected by the Studio.
  'script-src': ['https://core.sanity-cdn.com'],
  // The Studio's Inter font.
  'font-src': ['https://design-system-static.sanity.io'],
  // User avatars come from whichever login provider each editor used
  // (Google, GitHub, SAML), so no host list covers them. Cost: any HTTPS
  // image host loads on Studio routes; site routes keep their narrow list.
  'img-src': ['https:'],
  // Project API and the realtime socket for presence and listeners. The bare
  // `sanity-cdn.com` is the Studio's check for a newer `sanity` version.
  'connect-src': [
    'https://*.sanity.io',
    'wss://*.api.sanity.io',
    'https://core.sanity-cdn.com',
    'https://sanity-cdn.com',
  ],
}

// Not derived from the integrations. Merged into the single header because
// Next's `headers` config emits one value per header key per route.
const FRAME_ANCESTORS = ["'self'", 'https://*.sanity.studio']

/**
 * Directives in output order. Fixed so the composed header is deterministic
 * across builds.
 *
 * `worker-src` is absent: `lib/webgl/**` has no decoder workers, and the one
 * `blob:` use (`lib/dev/theatre/studio`'s save-file download link) is
 * dev-only and not a worker or fetch. Add it if a worker appears.
 *
 * `media-src` is present for `checkIsAutoplaySupported()` in
 * `lib/hooks/use-device-detection.ts`, which probes with a `data:video/mp4`
 * source on every route.
 */
const DIRECTIVE_ORDER: CspDirective[] = [
  'script-src',
  'style-src',
  'img-src',
  'font-src',
  'connect-src',
  'frame-src',
  'media-src',
  'form-action',
]

interface ComposeCspOptions {
  /** `process.env.NODE_ENV === 'development'` at the call site. */
  isDev: boolean
  /** `process.env.VERCEL_ENV === 'preview'` at the call site. */
  isVercelPreview: boolean
  /**
   * Compose the policy for the embedded Sanity Studio (`/studio/*`) instead
   * of the site. Adds `STUDIO_SOURCES` while Sanity is kept.
   */
  isStudio?: boolean
}

/**
 * Build the enforced `Content-Security-Policy` header value for the current
 * environment: the base policy, plus every kept integration's `cspSources`,
 * plus environment-specific additions, plus the project escape hatch.
 */
export function composeCsp({
  isDev,
  isVercelPreview,
  isStudio = false,
}: ComposeCspOptions): string {
  // `'unsafe-inline'` is the no-nonce trade-off from the header comment;
  // app/(site)/layout.tsx's inline `window.satusVersion` script needs it.
  const base: CspSources = {
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    // data: for next/image blur placeholders. blob: has no current use; kept
    // for future client-side image generation. It is a scheme, not a host,
    // so it cannot exfiltrate to a third party.
    'img-src': ["'self'", 'data:', 'blob:'],
    // next/font self-hosts, so no external font host is needed.
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...(isDev ? ['ws:', 'wss:'] : [])],
    // Declared although `default-src` covers it: any other `frame-src`
    // source (preview toolbar, Turnstile) replaces that fallback, and without
    // 'self' the Studio's Presentation iframe is blocked.
    'frame-src': ["'self'"],
    // data: for the autoplay probe (see DIRECTIVE_ORDER). `media-src` falls
    // back to `default-src 'self'`, which blocks it on every route.
    'media-src': ["'self'", 'data:'],
    // Does not fall back to default-src: omitting it lets forms submit
    // anywhere. Integrations submit through Server Actions / Route Handlers;
    // a cross-origin <form action> adds its origin via
    // PROJECT_CSP_EXTRA_SOURCES.
    'form-action': ["'self'"],
  }

  // `@vercel/analytics` reaches an external host only when
  // NODE_ENV=development (deployments use the same-origin
  // `/_vercel/insights/script.js`), i.e. under `vercel dev`. Plain `next dev`
  // never renders `<Analytics />` (layout gates it on VERCEL_ENV). A
  // defensive allowance, not an observed violation.
  const devVercelAnalytics: CspSources = isDev
    ? {
        'script-src': ['https://va.vercel-scripts.com'],
        'connect-src': [
          'https://va.vercel-scripts.com',
          'https://*.vercel-insights.com',
        ],
      }
    : {}

  // Vercel's preview feedback toolbar, injected on Preview deployments.
  // Origins per Vercel's published toolbar CSP requirements.
  const previewToolbar: CspSources = isVercelPreview
    ? {
        'script-src': ['https://vercel.live'],
        'connect-src': ['https://vercel.live', 'wss://ws-us3.pusher.com'],
        'img-src': ['https://vercel.live', 'https://vercel.com'],
        'frame-src': ['https://vercel.live'],
        'style-src': ['https://vercel.live'],
        'font-src': ['https://vercel.live'],
      }
    : {}

  const keptIntegrationSources = mergeSources(
    // SAFETY: `id` comes from `Object.entries(integrations)`, so it is
    // always one of `integrations`' own keys — `Object.entries` types every
    // key as plain `string` regardless of the source object.
    ...Object.entries(integrations)
      .filter(([id]) => isIntegrationKept(id as IntegrationId))
      .map(
        // SAFETY: widen from the literal per-entry union (where entries
        // without cspSources don't structurally carry the property at all)
        // to the interface, which declares it optional — same pattern as
        // `hasCapability`'s `entry: IntegrationEntry` widening in ./registry.
        ([, entry]) => (entry as IntegrationEntry).cspSources ?? {}
      )
  )

  const studio: CspSources =
    isStudio && isIntegrationKept('sanity') ? STUDIO_SOURCES : {}

  const merged = mergeSources(
    base,
    keptIntegrationSources,
    devVercelAnalytics,
    previewToolbar,
    studio,
    PROJECT_CSP_EXTRA_SOURCES
  )

  const directives = DIRECTIVE_ORDER.filter(
    (directive) => merged[directive]?.length
  ).map(
    // SAFETY: the `.filter` above already dropped every directive whose
    // `merged[directive]` is empty/undefined, so each remaining directive's
    // value is a non-empty `string[]` — `noUncheckedIndexedAccess` can't see
    // that guarantee across the two separate array methods.
    (directive) => `${directive} ${(merged[directive] as string[]).join(' ')}`
  )

  return [
    "default-src 'self'",
    ...directives,
    "object-src 'none'",
    "base-uri 'self'",
    `frame-ancestors ${FRAME_ANCESTORS.join(' ')}`,
  ]
    .join('; ')
    .concat(';')
}
