import { describe, expect, it } from 'bun:test'

import { guardedPrompt } from './prompts'
import {
  findUnknownFlags,
  KNOWN_SETUP_FLAGS,
  PROJECT_PRESETS,
  shouldSkipConfirm,
} from './setup-project'
import { getFlagValue, projectRoot } from './utils'

// A typo'd CLI flag must be rejected by findUnknownFlags, not fall through to
// the interactive prompt, which hangs on a non-TTY-but-open stdin (CI).

describe('findUnknownFlags (M4 — unknown-flag rejection)', () => {
  it('returns [] for every documented flag, long and short form', () => {
    expect(findUnknownFlags(['--preset', 'editorial'])).toEqual([])
    expect(findUnknownFlags(['--keep', 'sanity,shopify'])).toEqual([])
    expect(findUnknownFlags(['--yes'])).toEqual([])
    expect(findUnknownFlags(['--clean-homepage'])).toEqual([])
    expect(findUnknownFlags(['--skip-install'])).toEqual([])
    expect(findUnknownFlags(['--dry-run'])).toEqual([])
    expect(findUnknownFlags(['--help'])).toEqual([])
    expect(findUnknownFlags(['--preset=editorial'])).toEqual([])
  })

  it('flags a typo of a known long flag', () => {
    expect(findUnknownFlags(['--presett', 'editorial'])).toEqual(['--presett'])
  })

  it('never flags a bare value, even one that looks flag-like as an id', () => {
    // --keep's value is a comma-separated id list, never itself `--`-prefixed
    // in practice, but the value token itself must never be checked — only
    // `--`-prefixed tokens are.
    expect(findUnknownFlags(['--keep', 'sanity'])).toEqual([])
  })

  it('collects every unknown flag, not just the first', () => {
    expect(findUnknownFlags(['--bogus', '--yes', '--nope'])).toEqual([
      '--bogus',
      '--nope',
    ])
  })

  it('KNOWN_SETUP_FLAGS matches what printUsage documents', () => {
    expect(KNOWN_SETUP_FLAGS).toContain('--preset')
    expect(KNOWN_SETUP_FLAGS).toContain('--keep')
    expect(KNOWN_SETUP_FLAGS).toContain('--yes')
    expect(KNOWN_SETUP_FLAGS).toContain('--clean-homepage')
    expect(KNOWN_SETUP_FLAGS).toContain('--skip-install')
    expect(KNOWN_SETUP_FLAGS).toContain('--dry-run')
    expect(KNOWN_SETUP_FLAGS).toContain('--help')
  })

  it('an unknown flag exits 1 before reaching the interactive prompt (subprocess)', () => {
    const proc = Bun.spawnSync(
      ['bun', 'lib/scripts/setup-project.ts', '--totally-bogus-flag'],
      {
        cwd: projectRoot,
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: 'ignore',
      }
    )
    expect(proc.exitCode).toBe(1)
    const output = proc.stdout.toString() + proc.stderr.toString()
    expect(output).toContain('--totally-bogus-flag')
  }, 20000)
})

// Duplicate CLI flags: first wins, with a warning.
describe('getFlagValue (L4 — duplicate flag warning)', () => {
  it('returns the single value when the flag is passed once', () => {
    expect(getFlagValue(['--keep', 'sanity'], '--keep')).toBe('sanity')
  })

  it('keeps first-wins semantics when the flag is passed twice', () => {
    const result = getFlagValue(
      ['--keep', 'sanity', '--keep', 'webgl'],
      '--keep'
    )
    expect(result).toBe('sanity')
  })

  it('warns naming the flag and the winning value on duplicates', () => {
    const warnCalls: unknown[][] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => {
      warnCalls.push(args)
    }

    try {
      getFlagValue(['--preset', 'studio', '--preset', 'blank'], '--preset')
    } finally {
      console.warn = originalWarn
    }

    expect(warnCalls).toHaveLength(1)
    const [message] = warnCalls[0] as [string]
    expect(message).toContain('--preset')
    expect(message).toContain('studio')
    expect(message).toContain('blank')
  })

  it('does not warn when the flag appears once or not at all', () => {
    const warnCalls: unknown[][] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => {
      warnCalls.push(args)
    }

    try {
      getFlagValue(['--keep', 'sanity'], '--keep')
      getFlagValue(['--other', 'x'], '--keep')
    } finally {
      console.warn = originalWarn
    }

    expect(warnCalls).toHaveLength(0)
  })

  it('supports the --flag=value duplicate form too', () => {
    const warnCalls: unknown[][] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => {
      warnCalls.push(args)
    }

    try {
      const result = getFlagValue(['--ref=main', '--ref=v2'], '--ref')
      expect(result).toBe('main')
    } finally {
      console.warn = originalWarn
    }

    expect(warnCalls).toHaveLength(1)
  })
})

describe('shouldSkipConfirm (H6 — --yes gating)', () => {
  it('always skips when --yes is passed', () => {
    expect(shouldSkipConfirm({ yes: true, hasFlags: false, isTTY: true })).toBe(
      true
    )
    expect(shouldSkipConfirm({ yes: true, hasFlags: true, isTTY: true })).toBe(
      true
    )
    expect(shouldSkipConfirm({ yes: true, hasFlags: true, isTTY: false })).toBe(
      true
    )
  })

  it('never skips for a fully interactive run (no --preset/--keep)', () => {
    expect(
      shouldSkipConfirm({ yes: false, hasFlags: false, isTTY: true })
    ).toBe(false)
    expect(
      shouldSkipConfirm({ yes: false, hasFlags: false, isTTY: false })
    ).toBe(false)
  })

  it('shows the prompt for --preset/--keep at an interactive terminal without --yes', () => {
    expect(shouldSkipConfirm({ yes: false, hasFlags: true, isTTY: true })).toBe(
      false
    )
  })

  it('skips for --preset/--keep off a TTY without --yes (create-darkroom contract)', () => {
    expect(
      shouldSkipConfirm({ yes: false, hasFlags: true, isTTY: false })
    ).toBe(true)
  })
})

// Cancel/EOF guard: stdin closing before a prompt resolves must exit 1 with a
// readable message, never a silent exit 0. Runs against the real repo tree
// (no copy needed): with no flags the stdin-close race fires before any
// mutation, so this is read-only.

describe('P-D2: stdin EOF guard (guardedPrompt)', () => {
  it('bun run setup:project </dev/null exits 1 with a readable stderr message', async () => {
    const proc = Bun.spawnSync(['bun', 'lib/scripts/setup-project.ts'], {
      cwd: projectRoot,
      stdin: new Response(''), // closed stdin — simulates `</dev/null`
      stdout: 'pipe',
      stderr: 'pipe',
    })

    expect(proc.exitCode).toBe(1)
    const stderr = proc.stderr.toString()
    expect(stderr).toContain('Setup cancelled')
    expect(stderr).toContain('stdin closed')
    expect(stderr).toContain('--preset')
  }, 20000)
})

// Answer-wins ordering: guardedPrompt must not false-cancel when a legitimate
// final answer races stdin's `close` event (a default confirm immediately
// followed by pipe closure, e.g. `printf '\n' | script`).

describe('guardedPrompt (answer-wins ordering)', () => {
  it('a prompt that resolves one microtask AFTER stdin close still wins (the actual repro: setImmediate defers long enough for the answer to land first)', async () => {
    const promptFn = () =>
      new Promise<string>((resolve) => {
        // Stdin closes first (its `eof` promise is already settled when
        // Promise.race runs) and the answer settles one microtask later, as a
        // real @clack/core resolution racing a piped stream's `close` can.
        // Without the setImmediate defer, Promise.race picks `eof` and this
        // incorrectly exits as cancelled.
        process.stdin.emit('close')
        queueMicrotask(() => resolve('no'))
      })

    const result = await guardedPrompt(promptFn, 'test cancelled')
    expect(result).toBe('no')
  })
})

// --help/-h must print usage, not fall through into a live interactive run.

describe('P-B6: --help prints usage and exits 0', () => {
  it('lists every flag and every preset key, and exits 0', async () => {
    const proc = Bun.spawnSync(
      ['bun', 'lib/scripts/setup-project.ts', '--help'],
      {
        cwd: projectRoot,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    )

    expect(proc.exitCode).toBe(0)
    const stdout = proc.stdout.toString()
    expect(stdout).toContain('Usage:')
    expect(stdout).toContain('--preset')
    expect(stdout).toContain('--keep')
    expect(stdout).toContain('--yes')
    expect(stdout).toContain('--skip-install')
    for (const key of Object.keys(PROJECT_PRESETS)) {
      expect(stdout).toContain(key)
    }
  }, 20000)

  it('-h is equivalent to --help', async () => {
    const proc = Bun.spawnSync(['bun', 'lib/scripts/setup-project.ts', '-h'], {
      cwd: projectRoot,
      stdout: 'pipe',
    })
    expect(proc.exitCode).toBe(0)
    expect(proc.stdout.toString()).toContain('Usage:')
  }, 20000)
})
