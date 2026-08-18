/**
 * Content-Security-Policy composer
 *
 * `next.config.ts` calls `composeCsp()` at config-eval time to build the
 * single enforced `Content-Security-Policy` header value. This is
 * deliberately config-eval composition — a pure function next.config.ts
 * imports and calls — rather than `setup:project` writing a literal policy
 * string into `next.config.ts` via an AST transform (the pattern it already
 * uses for `images.remotePatterns` / `experimental.optimizePackageImports`).
 * Config-eval composition can't drift: strip an integration's folder and its
 * origins vanish on the very next build, with no transform to keep in sync.
 * AST literal-writing was only the fallback if next.config.ts genuinely
 * couldn't import `lib/` code — verified empirically that it can (see
 * `isIntegrationKept` and the relative-import note in `./registry`).
 *
 * Every `Content-Security-Policy` value from every KEPT integration in
 * `./registry` (`cspSources`, see there for what "browser-visible" means) is
 * unioned with a small hand-maintained base policy, environment-specific
 * additions (dev-only HMR/eval, preview-only Vercel toolbar), and the
 * project-specific escape hatch below.
 *
 * Enforced, not Report-Only — see the CHANGELOG entry and #318: without a
 * nonce pipeline (out of scope here — that's a `proxy.ts` + per-request
 * headers architecture change), `script-src` still needs `'unsafe-inline'`
 * (and, in dev, `'unsafe-eval'` for React Refresh). That's a real, documented
 * gap: an injected `<script>` tag is not blocked by this policy. But
 * `connect-src`/`img-src`/`frame-ancestors` now have real teeth restricted to
 * exactly the origins the kept integrations load — a large upgrade over the
 * previous Report-Only baseline, which allowed `https:`/`wss:` everywhere
 * and enforced nothing.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type CspDirective,
  type CspSources,
  integrations,
  type IntegrationEntry,
  type IntegrationId,
} from './registry'

// -----------------------------------------------------------------------------
// Escape hatch — project-specific origins
// -----------------------------------------------------------------------------

/**
 * Extra CSP origins for things the registry can't know about: a custom API
 * this project's frontend calls, a third-party embed added after setup, a
 * HubSpot portal's own submission/tracking origin (see the `hubspot` entry
 * in `./registry` — not verifiable from this repo's code). Empty by default.
 * Merged into every environment (dev + prod + preview) — scope an origin to
 * one environment yourself inside `composeCsp` if that's ever needed.
 *
 * Example:
 * ```ts
 * export const PROJECT_CSP_EXTRA_SOURCES: CspSources = {
 *   'connect-src': ['https://api.example.com'],
 *   'frame-src': ['https://challenges.cloudflare.com'],
 * }
 * ```
 */
export const PROJECT_CSP_EXTRA_SOURCES: CspSources = {}

// -----------------------------------------------------------------------------
// "Kept" detection
// -----------------------------------------------------------------------------

// This module's own directory is lib/integrations/; the project root is two
// levels up. Resolved from import.meta.url (not process.cwd()) so it's
// correct regardless of the directory `next build`/`next dev` was invoked
// from.
const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url))

/**
 * Integration ids with no removable bundle in
 * `lib/scripts/integration-bundles.ts` (`INTEGRATION_BUNDLES`) — `turnstile`
 * and `analytics` ship unconditionally; `setup:project` has nothing to
 * strip for them (they're gated purely by env vars at runtime, not by file
 * presence). Their CSP origins are therefore always composed in, the same
 * way `isIntegrationKept` would report `true` for them if it checked a
 * folder that could never be absent.
 */
const NEVER_STRIPPED: ReadonlySet<IntegrationId> = new Set([
  'turnstile',
  'analytics',
])

/**
 * True when `id`'s integration code is present in this checkout.
 *
 * `setup:project` strips an unkept integration by deleting its entire
 * `lib/integrations/<id>` folder in one atomic step (see `setupLean` /
 * `setupAddIntegrations` in `lib/scripts/setup-project.ts`, and each
 * integration's `folders` entry in `lib/scripts/integration-bundles.ts`) —
 * so checking that folder's existence is a reliable, dependency-free proxy
 * for "kept". Deliberately not importing
 * `lib/scripts/integration-bundles.ts` here to read the real folder list:
 * that module is dev/setup tooling, and every kept id's primary folder is
 * exactly `lib/integrations/<id>` (verified against the bundle definitions
 * for sanity/shopify/hubspot/mailchimp), so hardcoding that one path per id
 * avoids pulling setup-script machinery into next.config.ts's eval path.
 *
 * Deliberately NOT based on `isConfigured(id)` (env-var presence, see
 * `./registry`): a project can keep an integration's code without having
 * filled in real credentials yet (e.g. a CI/preview build before secrets are
 * set), and the policy still needs to allow that origin the moment
 * credentials land. Composing from "kept" rather than "configured" means the
 * header only moves when the codebase changes, not when an env var does.
 */
function isIntegrationKept(id: IntegrationId): boolean {
  if (NEVER_STRIPPED.has(id)) return true
  return existsSync(join(PROJECT_ROOT, 'lib/integrations', id))
}

// -----------------------------------------------------------------------------
// Merging
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Composition
// -----------------------------------------------------------------------------

/**
 * `frame-ancestors` is intentionally NOT derived from anything above — kept
 * byte-for-byte identical to the previous enforced header (audit fix #267
 * L1) per #318's explicit instruction to leave it untouched. It's merged
 * into the same single `Content-Security-Policy` header as everything else
 * here (rather than staying a second header entry) because Next's `headers`
 * config can only emit one value per header key per route.
 */
const FRAME_ANCESTORS = ["'self'", 'https://*.sanity.studio']

/**
 * Directives in output order. Fixed (not derived from `Object.entries`
 * insertion order) so the composed header is deterministic across builds —
 * useful for diffing and for the verification snapshot in #318.
 *
 * `worker-src` is deliberately absent: audited `lib/webgl/**` for
 * `Worker(`/loader usage (DRACOLoader, KTX2Loader, etc.) and found none — no
 * decoder workers. Omitting it falls back to `script-src`/`default-src`,
 * which already cover the only blob: use found (`lib/dev/theatre/studio`'s
 * `URL.createObjectURL` for a save-file *download* link — an anchor
 * navigation, not a fetch/worker, and dev-only). Add it (with sources) if
 * that changes.
 *
 * `media-src` IS present: `lib/hooks/use-device-detection.ts`'s
 * `checkIsAutoplaySupported()` (used by every `useDeviceDetection()` caller,
 * i.e. every route, not an integration) creates a `<video>` with a
 * `data:video/mp4;base64,...` source to probe inline-autoplay support — a
 * real violation caught by this PR's own dev-server check (`media-src` falls
 * back to `default-src 'self'` when unset, which has no `data:` scheme).
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
}

/**
 * Build the enforced `Content-Security-Policy` header value for the current
 * environment: the base policy, plus every kept integration's `cspSources`,
 * plus environment-specific additions, plus the project escape hatch.
 */
export function composeCsp({
  isDev,
  isVercelPreview,
}: ComposeCspOptions): string {
  // Base policy. `'unsafe-inline'` on script-src/style-src is the documented
  // trade-off from this module's header comment (no nonce pipeline in this
  // PR) — see e.g. app/(site)/layout.tsx's inline `window.satusVersion`
  // script, which needs it. `'unsafe-eval'` is dev-only, for React Refresh.
  const base: CspSources = {
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    // data: — next/image blur placeholders. blob: — no current use found
    // (see DIRECTIVE_ORDER's comment) but kept as a low-risk allowance for
    // future client-side image generation (e.g. canvas.toBlob previews);
    // it's a scheme, not a host, so it can't be used to exfiltrate to a
    // third party.
    'img-src': ["'self'", 'data:', 'blob:'],
    // next/font self-hosts Google Fonts at build time (see lib/styles/fonts.ts)
    // — no external font-src host is ever needed.
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...(isDev ? ['ws:', 'wss:'] : [])],
    // data: — lib/hooks/use-device-detection.ts's autoplay probe (see
    // DIRECTIVE_ORDER's comment). Without this, `media-src` falls back to
    // `default-src 'self'`, which has no `data:` scheme, and every route
    // using `useDeviceDetection()` throws a CSP violation on load.
    'media-src': ["'self'", 'data:'],
    // `form-action` is a navigation directive — it does NOT fall back to
    // default-src, so omitting it means "forms may submit anywhere". Every
    // integration submits through Server Actions / Route Handlers ('self'),
    // never a cross-origin <form action>; a third-party embed that needs one
    // adds its origin via PROJECT_CSP_EXTRA_SOURCES.
    'form-action': ["'self'"],
  }

  // Dev-only: `@vercel/analytics`'s script tag only reaches an external host
  // when `NODE_ENV === 'development'` (see the package's `getScriptSrc` —
  // `isDevelopment()` checks NODE_ENV, not VERCEL_ENV). On every real
  // deployment (`next build` always sets NODE_ENV=production) it loads from
  // the same-origin `/_vercel/insights/script.js` path instead, needing
  // nothing here. This only matters for `vercel dev` locally (VERCEL_ENV set
  // + NODE_ENV=development) — `bun run dev`/`next dev` alone never renders
  // `<Analytics />` at all (app/(site)/layout.tsx gates it on VERCEL_ENV), so
  // this is a defensive allowance for a workflow this PR's own verification
  // can't exercise, not something observed to violate.
  const devVercelAnalytics: CspSources = isDev
    ? {
        'script-src': ['https://va.vercel-scripts.com'],
        'connect-src': [
          'https://va.vercel-scripts.com',
          'https://*.vercel-insights.com',
        ],
      }
    : {}

  // Preview-only: Vercel's preview feedback toolbar (injected automatically
  // on Preview deployments, unrelated to any package in this repo). Origins
  // per Vercel's published toolbar CSP requirements.
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

  const merged = mergeSources(
    base,
    keptIntegrationSources,
    devVercelAnalytics,
    previewToolbar,
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
