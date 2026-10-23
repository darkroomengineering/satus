import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { unlink } from 'node:fs/promises'

import { cleanupEnvVars } from './prepare-handoff'
import { projectRoot, resolvePath } from './utils'

// Cancel/EOF guard: stdin closing before the top-level prompt resolves must
// exit 1 with a readable message, never a silent exit 0 (mirrors the
// setup-project.test.ts test).

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

// issue #387: cleanupEnvVars's `alwaysKeep` regexes matched Turnstile's secret
// key (CLOUDFLARE_TURNSTILE_SECRET_KEY) but not its NEXT_PUBLIC_-prefixed site
// key, so `bun run handoff` deleted the site key line. Turnstile has no
// bundle, so both vars must always survive cleanup.
//
// `cleanupEnvVars` resolves `.env.example` off `resolvePath`, keyed to the
// `process.cwd()` captured at module load (same constraint as
// setup-project.test.ts), so there is no fixture tree to redirect it. This
// test backs up the real `.env.example`, writes a scratch fixture, runs the
// real function, and restores the original regardless of outcome.

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
    // Always restore, even when .env.example did not exist: a leftover
    // fixture would become the committed .env.example.
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
    // Protected by no alwaysKeep rule and owned by no installed integration,
    // so it must be stripped: proves the filter still discriminates.
    expect(content).not.toContain('SOME_UNRELATED_INTEGRATION_KEY')
  })
})
