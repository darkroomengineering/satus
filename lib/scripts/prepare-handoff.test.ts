import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { cleanupEnvVars } from './prepare-handoff'
import { projectRoot } from './utils'

// Cancel/EOF guard: stdin closing before the top-level prompt resolves must
// exit 1 with a readable message, never a silent exit 0 (mirrors the
// setup-project.cli.test.ts test).

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
// `cleanupEnvVars` takes the file path, so the test runs on a temp copy and
// never writes the tracked `.env.example`.

describe('cleanupEnvVars — Turnstile survives (#387)', () => {
  let tmpDir: string
  let envExamplePath: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'handoff-env-'))
    envExamplePath = join(tmpDir, '.env.example')
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
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('keeps both the Turnstile site key and secret key', async () => {
    await cleanupEnvVars(false, envExamplePath)

    const content = await Bun.file(envExamplePath).text()
    expect(content).toContain('NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY')
    expect(content).toContain('CLOUDFLARE_TURNSTILE_SECRET_KEY')
    // Protected by no alwaysKeep rule and owned by no installed integration,
    // so it must be stripped: proves the filter still discriminates.
    expect(content).not.toContain('SOME_UNRELATED_INTEGRATION_KEY')
  })
})
