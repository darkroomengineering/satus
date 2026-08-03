/**
 * create-darkroom flag-contract canary
 *
 * `create-darkroom` (the scaffolder CLI, a separate repo) clones satus `main`
 * and invokes `bun run setup:project` with pass-through flags. It has no
 * version pin on satus. This file mirrors that invocation exactly — its
 * ground truth is `create-darkroom`'s `src/index.ts`, verbatim:
 *
 *   235	    const setupArgs = ['run', 'setup:project']
 *   236	    if (args.preset !== undefined) setupArgs.push('--preset', args.preset)
 *   237	    if (args.keep !== undefined) setupArgs.push('--keep', args.keep)
 *   238	    if (args.cleanHomepage) setupArgs.push('--clean-homepage')
 *   239
 *   240	    if (!run('bun', setupArgs, projectPath)) {
 *   241	      fail('setup:project failed — the clone is intact, re-run it manually')
 *
 * Note it does NOT pass `--yes` — it relies on `setup-project.ts`'s non-TTY
 * skip (see `shouldSkipConfirm`) to avoid hanging on a confirm prompt.
 *
 * If a satus PR renames or changes the semantics of any of these flags — and
 * updates satus's own tests in the same PR — everything here stays green
 * while every future `create-darkroom` scaffold breaks silently. A failure
 * in this file means exactly that: a change here breaks scaffolding for
 * every new project created via `create-darkroom`. The fix is a coordinated
 * change in BOTH repos (this one, and create-darkroom), never editing this
 * test to match a renamed/removed flag.
 *
 * Prune-safety: this file derives presets/ids from the live
 * `PROJECT_PRESETS` / `getIntegrationNames()` exports rather than hardcoding
 * integration names (beyond asserting the universally-present `blank`
 * preset exists), so it survives `setup:project` stripping integrations out
 * of a scaffolded project. (This file itself ships only in the satus repo,
 * not in scaffolded projects — see `SELF_PRUNE_KEEP_TEST_FILES` in
 * `setup-project.ts` for the self-prune allowlist that governs which test
 * files DO ship; this one isn't in it, matching `env-drift.test.ts`.)
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

    // setup-project.ts parses process.argv manually (via `getFlagValue` /
    // `argv.includes`), not `util.parseArgs`. Anchor each assertion to that
    // exact call shape — not to a comment mentioning the flag — so a rename
    // of the flag string here fails this test even if a comment still
    // mentions the old name.
    expect(source).toContain(`getFlagValue(argv, '--preset')`)
    expect(source).toContain(`getFlagValue(argv, '--keep')`)
    expect(source).toContain(`argv.includes('--clean-homepage')`)
    expect(source).toContain(`argv.includes('--yes')`)
  })

  it("--preset resolves to that preset's integrations, for every preset key", () => {
    const presetKeys = Object.keys(PROJECT_PRESETS)

    // create-darkroom offers the preset list dynamically — don't hardcode
    // beyond asserting the universal 'blank' preset is among them.
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
