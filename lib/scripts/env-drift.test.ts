/**
 * Env-var drift invariant
 *
 * `lib/scripts/integration-bundles.ts` declares each integration's `envVars`,
 * which `setup:project` uses to strip lines from `.env.example` when that
 * integration is removed. Two silent-drift classes are possible here, and
 * both happened for real in this repo:
 *
 *  (a) A bundle declares a var that no schema key backs — `.env.example`
 *      would strip a line for a var nothing reads (this happened with two
 *      dead `SHOPIFY_CUSTOMER_ACCOUNT_API_*` entries).
 *  (b) A schema key that clearly belongs to an integration (by name prefix)
 *      is missing from that integration's `envVars` — removing the
 *      integration then orphans a real env var in `.env.example` forever
 *      (this happened with `NEXT_PUBLIC_SANITY_API_VERSION` and
 *      `HUBSPOT_ALLOWED_FORM_IDS`).
 *
 * The source of truth for "what env vars exist" is the Zod schema in
 * `lib/env.ts`, parsed as text (never imported/hardcoded) so this test can
 * never itself drift from the schema.
 *
 * This test intentionally does NOT assert every schema key is owned by some
 * bundle — a handful of keys (NODE_ENV, NEXT_PUBLIC_BASE_URL, analytics,
 * Turnstile) are registry entries with no removable bundle, and that's a
 * legitimate, permanent state, not drift.
 */

import { describe, expect, it } from 'bun:test'

import { getIntegrationEntries } from './integration-bundles'

/** Extract schema keys from the two-space-indented `KEY: z...` lines in lib/env.ts. */
async function getSchemaKeys(): Promise<string[]> {
  const source = await Bun.file('lib/env.ts').text()
  const keys: string[] = []
  for (const line of source.split('\n')) {
    const match = /^ {2}([A-Z0-9_]+):/.exec(line)
    if (match?.[1]) keys.push(match[1])
  }
  return keys
}

/**
 * Does `bundleId` own `key`, by case-insensitive prefix match on the bundle
 * id, allowing an optional `NEXT_PUBLIC_` prefix on the key?
 * e.g. bundle "sanity" owns "SANITY_REVALIDATE_SECRET" and
 * "NEXT_PUBLIC_SANITY_DATASET".
 */
function ownsKey(bundleId: string, key: string): boolean {
  const bare = key.startsWith('NEXT_PUBLIC_')
    ? key.slice('NEXT_PUBLIC_'.length)
    : key
  return bare.toUpperCase().startsWith(`${bundleId.toUpperCase()}_`)
}

describe('env-var drift (lib/env.ts <-> integration-bundles.ts)', () => {
  it('(a) no bundle declares an envVar that does not exist in the lib/env.ts schema', async () => {
    const schemaKeys = new Set(await getSchemaKeys())

    for (const [name, bundle] of getIntegrationEntries()) {
      for (const envVar of bundle.envVars) {
        expect(
          schemaKeys.has(envVar),
          `Bundle "${name}" declares envVar "${envVar}" which does not exist in lib/env.ts — ` +
            'removing this integration would strip a line for a var nothing reads.'
        ).toBe(true)
      }
    }
  })

  it('(b) every schema key that matches a bundle’s name prefix is declared by that bundle', async () => {
    const schemaKeys = await getSchemaKeys()

    for (const [name, bundle] of getIntegrationEntries()) {
      const declared = new Set(bundle.envVars)
      const owned = schemaKeys.filter((key) => ownsKey(name, key))

      for (const key of owned) {
        expect(
          declared.has(key),
          `Schema key "${key}" belongs to bundle "${name}" (by name prefix) but is not in its envVars — ` +
            'removing this integration would orphan the var in .env.example.'
        ).toBe(true)
      }
    }
  })
})
