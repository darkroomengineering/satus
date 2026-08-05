/**
 * Sanity project-ID alias parity (issue #380)
 *
 * `lib/integrations/sanity/env.ts` resolves `projectId` from
 * `NEXT_PUBLIC_SANITY_PROJECT_ID` with a fallback to `SANITY_STUDIO_PROJECT_ID`
 * (Sanity's own CLI/template convention). `sanityEnvSchema` in
 * `lib/utils/validation.ts` is a separate schema — it can't import
 * `sanity/env.ts` (nor vice versa: `sanity/env.ts` is dual-compiled into the
 * client bundle and must not pull in server-only code), so the two are two
 * independent copies of the same fallback chain. This test fails if they
 * ever disagree about which env var names count as "the project ID".
 *
 * It parses `sanity/env.ts` as text (never imports/hardcodes it) so the
 * comparison can't itself drift from the source of truth — the same
 * approach `lib/scripts/env-drift.test.ts` uses for the wider schema.
 */

import { describe, expect, it } from 'bun:test'

import { sanityEnvSchema } from './validation'

/** Every `process.env.X` name referenced in `env.ts`'s `projectId` fallback chain. */
async function getProjectIdAliasesFromEnvTs(): Promise<string[]> {
  const source = await Bun.file('lib/integrations/sanity/env.ts').text()
  const match = /export const projectId =\s*([\s\S]*?)\n\n/.exec(source)
  const block = match?.[1] ?? ''
  return [...block.matchAll(/process\.env\.([A-Z0-9_]+)/g)]
    .map((m) => m[1])
    .filter((name): name is string => name !== undefined)
}

describe('sanityEnvSchema <-> lib/integrations/sanity/env.ts project ID alias parity', () => {
  it('env.ts declares both the primary var and the SANITY_STUDIO_PROJECT_ID alias', async () => {
    const aliases = await getProjectIdAliasesFromEnvTs()
    expect(aliases).toContain('NEXT_PUBLIC_SANITY_PROJECT_ID')
    expect(aliases).toContain('SANITY_STUDIO_PROJECT_ID')
  })

  it('every project ID alias env.ts recognizes also satisfies sanityEnvSchema on its own', async () => {
    const aliases = await getProjectIdAliasesFromEnvTs()

    for (const alias of aliases) {
      const result = sanityEnvSchema.safeParse({
        [alias]: 'test-project-id',
        NEXT_PUBLIC_SANITY_DATASET: 'production',
      })
      expect(
        result.success,
        `sanityEnvSchema does not accept "${alias}" as a project ID, but ` +
          "lib/integrations/sanity/env.ts's projectId falls back to it — " +
          'the schema and the runtime env reader disagree about whether ' +
          'Sanity is configured.'
      ).toBe(true)
    }
  })
})
