/**
 * create-darkroom flag-contract canary. `create-darkroom` (a separate repo,
 * no version pin on satus) clones satus `main` and runs `bun run setup:project`
 * with pass-through flags. Ground truth, from its `src/index.ts`:
 *
 *   235	    const setupArgs = ['run', 'setup:project']
 *   236	    if (args.preset !== undefined) setupArgs.push('--preset', args.preset)
 *   237	    if (args.keep !== undefined) setupArgs.push('--keep', args.keep)
 *   238	    if (args.cleanHomepage) setupArgs.push('--clean-homepage')
 *   239
 *   240	    if (!run('bun', setupArgs, projectPath)) {
 *   241	      fail('setup:project failed — the clone is intact, re-run it manually')
 *
 * It does NOT pass `--yes`; it relies on the non-TTY skip (`shouldSkipConfirm`)
 * to avoid hanging on a confirm prompt.
 *
 * A satus PR that renames or changes these flags while updating satus's own
 * tests keeps everything green and silently breaks every future scaffold. A
 * failure here therefore needs a coordinated change in BOTH repos, never an
 * edit of this test to match a renamed or removed flag.
 *
 * Presets and ids come from the live `PROJECT_PRESETS` / `getIntegrationNames()`
 * exports (beyond asserting `blank` exists) so the file survives stripping.
 * It ships only in the satus repo: not in `SELF_PRUNE_KEEP_TEST_FILES`.
 */

import { describe, expect, it } from 'bun:test'

import { getIntegrationNames } from './integration-bundles'
import {
  PROJECT_PRESETS,
  resolveKeepFromFlags,
  shouldSkipConfirm,
} from './setup-project'

describe('create-darkroom flag contract', () => {
  it('the literal argv strings create-darkroom depends on are wired into the actual argv-parsing mechanism', async () => {
    const source = await Bun.file('lib/scripts/setup-project.ts').text()

    // setup-project.ts parses argv manually (`getFlagValue` / `argv.includes`).
    // Anchored to that call shape, not a comment, so a renamed flag fails even
    // if a comment still mentions the old name.
    expect(source).toContain(`getFlagValue(argv, '--preset')`)
    expect(source).toContain(`getFlagValue(argv, '--keep')`)
    expect(source).toContain(`argv.includes('--clean-homepage')`)
    expect(source).toContain(`argv.includes('--yes')`)
  })

  it("--preset resolves to that preset's integrations, for every preset key", () => {
    const presetKeys = Object.keys(PROJECT_PRESETS)

    expect(presetKeys).toContain('blank')

    for (const key of presetKeys) {
      const expected =
        PROJECT_PRESETS[key as keyof typeof PROJECT_PRESETS].integrations
      expect(resolveKeepFromFlags(key, undefined)).toEqual([...expected])
    }
  })

  it('--keep \'\' resolves to an empty array (the documented "lean build"), not undefined and not a throw', () => {
    const result = resolveKeepFromFlags(undefined, '')
    expect(result).toEqual([])
  })

  it('--preset and --keep together still throw — create-darkroom never sends both, and the throw is the guard', () => {
    expect(() => resolveKeepFromFlags('blank', '')).toThrow()
  })

  it('a create-darkroom invocation (flags present, non-TTY, no --yes) skips the confirm prompt', () => {
    expect(
      shouldSkipConfirm({ yes: false, hasFlags: true, isTTY: false })
    ).toBe(true)
  })

  it('the same invocation at an interactive terminal (TTY) still confirms — the human-abort path the contract preserves', () => {
    expect(shouldSkipConfirm({ yes: false, hasFlags: true, isTTY: true })).toBe(
      false
    )
  })

  it('sanity: getIntegrationNames() stays a live, non-empty read (guards against the derivation itself going stale)', () => {
    expect(getIntegrationNames().length).toBeGreaterThan(0)
  })
})
