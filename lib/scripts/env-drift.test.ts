/**
 * Env-var drift invariant between `integration-bundles.ts` `envVars` (which
 * `setup:project` uses to strip `.env.example` lines) and the Zod schema in
 * `lib/env.ts`, parsed as text so this test can't drift from it:
 *  (a) A bundle var that no schema key backs would strip a line nothing reads.
 *  (b) A schema key belonging to an integration (by name prefix) but missing
 *      from its `envVars` is orphaned in `.env.example` when it's removed.
 *
 * It deliberately does NOT assert every schema key is bundle-owned: NODE_ENV,
 * NEXT_PUBLIC_BASE_URL, analytics and Turnstile have no removable bundle.
 */

import { describe, expect, it } from 'bun:test'

import { getIntegrationEntries } from './integration-bundles'

async function getSchemaKeys(): Promise<string[]> {
  const source = await Bun.file('lib/env.ts').text()
  const keys: string[] = []
  for (const line of source.split('\n')) {
    const match = /^ {2}([A-Z0-9_]+):/.exec(line)
    if (match?.[1]) keys.push(match[1])
  }
  return keys
}

/** Case-insensitive prefix match on the bundle id, allowing `NEXT_PUBLIC_` on the key. */
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
