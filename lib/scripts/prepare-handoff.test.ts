/**
 * Regression tests for lib/scripts/prepare-handoff.ts.
 *
 * Run with: bun test lib/scripts/prepare-handoff.test.ts
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { unlink } from 'node:fs/promises'

import { cleanupEnvVars } from './prepare-handoff'
import { projectRoot, resolvePath } from './utils'

// ---------------------------------------------------------------------------
// P-D2 — cancel/EOF guard: stdin closing before the top-level prompt
// resolves must exit 1 with a readable message, never fall through to a
// silent exit 0. Mirrors the setup-project.test.ts P-D2 test — `handoff`
// only got this fix later, after #370 (which only wired setup:project).
// ---------------------------------------------------------------------------

describe('P-D2: stdin EOF guard (handoff)', () => {
  it('bun run handoff </dev/null exits 1 with a readable stderr message', () => {
    const proc = Bun.spawnSync(['bun', 'lib/scripts/prepare-handoff.ts'], {
      cwd: projectRoot,
      stdin: new Response(''), // closed stdin — simulates `</dev/null`
      stdout: 'pipe',
      stderr: 'pipe',
    })

    expect(proc.exitCode).toBe(1)
    const stderr = proc.stderr.toString()
    expect(stderr).toContain('Handoff cancelled')
    expect(stderr).toContain('stdin closed')
  }, 20000)
})

// ---------------------------------------------------------------------------
// issue #387 — cleanupEnvVars's `alwaysKeep` regexes matched Turnstile's
// secret key (CLOUDFLARE_TURNSTILE_SECRET_KEY, no NEXT_PUBLIC_ prefix) but
// not its site key (NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY — see
// lib/env.ts:70), so `bun run handoff` silently deleted the site key line
// while keeping its secret-key sibling. Turnstile has no integration bundle,
// so both vars must always survive cleanup.
//
// `cleanupEnvVars` resolves `.env.example` off `resolvePath` (which is keyed
// to `process.cwd()` captured at module load, same constraint documented in
// setup-project.test.ts's Cache Components section) — there's no fixture-tree
// mechanism to redirect that, so this test backs up the real `.env.example`,
// writes a scratch fixture over it, runs the real function, and restores the
// original content afterward regardless of outcome.
// ---------------------------------------------------------------------------

describe('cleanupEnvVars — Turnstile survives (#387)', () => {
  const envExamplePath = resolvePath('.env.example')
  let originalContent: string | undefined

  beforeEach(async () => {
    const file = Bun.file(envExamplePath)
    originalContent = (await file.exists()) ? await file.text() : undefined
    await Bun.write(
      envExamplePath,
      [
        'NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=',
        'CLOUDFLARE_TURNSTILE_SECRET_KEY=',
        'SOME_UNRELATED_INTEGRATION_KEY=',
      ].join('\n')
    )
  })

  afterEach(async () => {
    // Always restore, including the case where .env.example did not exist
    // before the test — leaving this fixture behind would silently become
    // the repo's committed .env.example.
    if (originalContent === undefined) {
      try {
        await unlink(envExamplePath)
      } catch {
        // Already gone — nothing to restore.
      }
      return
    }
    await Bun.write(envExamplePath, originalContent)
  })

  it('keeps both the Turnstile site key and secret key', async () => {
    await cleanupEnvVars(false)

    const content = await Bun.file(envExamplePath).text()
    expect(content).toContain('NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY')
    expect(content).toContain('CLOUDFLARE_TURNSTILE_SECRET_KEY')
    // The unrelated, unbundled var isn't protected by any alwaysKeep rule
    // and isn't owned by any installed integration — it's the one that
    // should actually be stripped, proving the filter still discriminates.
    expect(content).not.toContain('SOME_UNRELATED_INTEGRATION_KEY')
  })
})
