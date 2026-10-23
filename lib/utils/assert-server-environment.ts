/**
 * Throws when `process.env` is the browser polyfill's permanently empty
 * object (a bundled-for-browser context). Guards modules that validate the
 * *whole* `process.env` (individual `process.env.NEXT_PUBLIC_X` literals are
 * inlined safely by bundlers) against silently treating every value as unset.
 * `@/integrations/registry` needed this after an unguarded whole-`process.env`
 * read caused a silent Studio 404; `@/lib/env` gets the same guard so a
 * client-reachable import fails loudly instead of `safeParse({})` succeeding
 * with every field `undefined`.
 *
 * Not a build-time guard: `import 'server-only'` throws outside Next's RSC
 * layer, which would break `bun test` and `bun run handoff`, both of which
 * import server-only-shaped modules legitimately.
 *
 * @param moduleName Import specifier named in the thrown error.
 */
export function assertServerEnvironment(moduleName: string): void {
  // Both conditions are needed. `window` alone is no browser tell: the test
  // suite registers happy-dom globals, so it has a `window` and a real
  // `process.env`. An empty env alone is no tell either: a bare server env is
  // unconfigured, not broken. Together they match only the bundled-for-browser
  // case, where the polyfill hands back `{}`.
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- environment assertion; literal typeof enables bundler dead-code elimination
  if (typeof window !== 'undefined' && Object.keys(process.env).length === 0) {
    throw new Error(
      `${moduleName} reads process.env and cannot run in the browser — ` +
        'call it from a Server Component, Route Handler, or Server Action.'
    )
  }
}
