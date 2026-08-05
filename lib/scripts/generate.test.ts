/**
 * Regression tests for lib/scripts/generate.ts's CLI entry point.
 *
 * Run with: bun test lib/scripts/generate.test.ts
 */

import { describe, expect, it } from 'bun:test'

import { projectRoot } from './utils'

// ---------------------------------------------------------------------------
// P-D2 — cancel/EOF guard: stdin closing before the top-level prompt
// resolves must exit 1 with a readable message, never fall through to a
// silent exit 0. Mirrors the setup-project.test.ts P-D2 test — `generate`
// only got this fix later, after #370 (which only wired setup:project).
// ---------------------------------------------------------------------------

describe('P-D2: stdin EOF guard (generate)', () => {
  it('bun run generate </dev/null exits 1 with a readable stderr message', () => {
    const proc = Bun.spawnSync(['bun', 'lib/scripts/generate.ts'], {
      cwd: projectRoot,
      stdin: new Response(''), // closed stdin — simulates `</dev/null`
      stdout: 'pipe',
      stderr: 'pipe',
    })

    expect(proc.exitCode).toBe(1)
    const stderr = proc.stderr.toString()
    expect(stderr).toContain('Generation cancelled')
    expect(stderr).toContain('stdin closed')
  }, 20000)
})
