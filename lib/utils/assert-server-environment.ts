/**
 * Throws if called from a bundled-for-browser context where `process.env` is
 * the browser polyfill's permanently empty object, rather than a real server
 * `process.env`.
 *
 * Guards modules that validate the *whole* `process.env` object (as opposed
 * to individual `process.env.NEXT_PUBLIC_X` literals, which bundlers inline
 * safely wherever they're read) against silently treating every value as
 * unset instead of failing loudly. `@/integrations/registry` needed this
 * guard after a real incident where an unguarded whole-`process.env` read
 * caused a silent Studio 404; `@/lib/env` reads the same way and gets the
 * same guard so a future client-reachable import fails loudly instead of
 * `safeParse({})` quietly succeeding with every field `undefined`.
 *
 * Not a build-time guard (`import 'server-only'` would be stronger, but
 * throws on import outside Next's RSC layer, which would break `bun test`
 * and `bun run handoff` — both import server-only-shaped modules
 * legitimately).
 *
 * @param moduleName Import specifier to name in the thrown error, so the
 *   message points at the offending module.
 */
export function assertServerEnvironment(moduleName: string): void {
  // Both conditions are needed. `window` alone is not a browser tell here:
  // the test suite registers happy-dom globals, so it has a `window` and a
  // real `process.env`. The empty-env check alone is not one either — a
  // genuinely bare server env is unconfigured, not broken. Together they
  // describe only the bundled-for-browser case, where the polyfill hands
  // back `{}` and every schema check would fail for the wrong reason.
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- environment assertion; literal typeof enables bundler dead-code elimination
  if (typeof window !== 'undefined' && Object.keys(process.env).length === 0) {
    throw new Error(
      `${moduleName} reads process.env and cannot run in the browser — ` +
        'call it from a Server Component, Route Handler, or Server Action.'
    )
  }
}
