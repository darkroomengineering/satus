import { afterEach, describe, expect, it } from 'bun:test'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

/**
 * Written from this failure list before the script:
 * 1. the private key appears in the script's output (an agent running it would see it)
 * 2. the key is passed as a command argument instead of on stdin
 * 3. a destination fails or is skipped and the script still exits 0
 * 4. .env is missing or not encrypted and the script carries on
 * 5. the key is not on this machine and something (e.g. "null") gets pushed
 * 6. .env.production exists but only DOTENV_PRIVATE_KEY is pushed
 * 7. Vercel gets production but not preview, or GitHub misses Dependabot
 * 8. an existing Vercel variable is not overwritten (rotating the key fails)
 *
 * `gh` and `vercel` are fakes that log their arguments and stdin.
 */

const script = join(import.meta.dir, 'env-setup.ts')
const dotenvx = join(
  dirname(
    createRequire(import.meta.url).resolve('@dotenvx/dotenvx/package.json')
  ),
  'src/cli/dotenvx.js'
)

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true })
})

interface ProjectOptions {
  /** Env files to create, by name. */
  files?: Record<string, string>
  encrypt?: boolean
  linkVercel?: boolean
  ghExitCode?: number
}

function makeProject({
  files = { '.env': 'SECRET="s3cret"\n' },
  encrypt = true,
  linkVercel = true,
  ghExitCode = 0,
}: ProjectOptions = {}) {
  const root = mkdtempSync(join(tmpdir(), 'env-setup-'))
  dirs.push(root)
  for (const [file, content] of Object.entries(files)) {
    writeFileSync(join(root, file), content)
    if (encrypt) {
      Bun.spawnSync(
        [process.execPath, dotenvx, 'encrypt', '-f', file, '--no-native'],
        { cwd: root, env: { ...process.env, CI: '1' } }
      )
    }
  }
  if (linkVercel) {
    mkdirSync(join(root, '.vercel'))
    writeFileSync(join(root, '.vercel', 'project.json'), '{}')
  }

  const bin = join(root, 'fake-bin')
  mkdirSync(bin)
  const log = join(root, 'calls.log')
  for (const [name, exitCode] of [
    ['gh', ghExitCode],
    ['vercel', 0],
  ] as const) {
    const path = join(bin, name)
    writeFileSync(
      path,
      // A failing fake echoes the key back, the way a CLI error message might.
      `#!/bin/sh\nin="$(cat)"\nprintf '%s args=%s stdin=%s\\n' "${name}" "$*" "$in" >> "${log}"\n[ ${exitCode} -ne 0 ] && echo "rejected $in" >&2\nexit ${exitCode}\n`
    )
    chmodSync(path, 0o755)
  }
  return { root, bin, log }
}

function run(project: ReturnType<typeof makeProject>, args: string[] = []) {
  // Without the caller's DOTENV_* keys, so only the project's .env.keys counts.
  const env: typeof process.env = {
    ...process.env,
    CI: '1',
    PATH: `${project.bin}:${process.env.PATH}`,
  }
  for (const key of Object.keys(env)) {
    if (key.startsWith('DOTENV_')) delete env[key]
  }
  const result = Bun.spawnSync([process.execPath, script, ...args], {
    cwd: project.root,
    env,
  })
  let calls: string[] = []
  try {
    calls = readFileSync(project.log, 'utf8').trim().split('\n')
  } catch {
    // No call was made.
  }
  return {
    exitCode: result.exitCode,
    output: `${result.stdout}${result.stderr}`,
    calls,
  }
}

function keyOf(root: string, name: string) {
  const line = readFileSync(join(root, '.env.keys'), 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith(`${name}=`))
  return line?.split('=')[1]?.replaceAll('"', '') ?? ''
}

describe('env:setup', () => {
  it('pipes the key to every destination on stdin and never prints it', () => {
    const project = makeProject()
    const key = keyOf(project.root, 'DOTENV_PRIVATE_KEY')
    const { exitCode, output, calls } = run(project)

    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(exitCode).toBe(0)
    expect(output).not.toContain(key)
    expect(calls).toHaveLength(4)
    for (const call of calls) {
      expect(call.split(' stdin=')[0]).not.toContain(key)
      expect(call).toEndWith(`stdin=${key}`)
    }
    expect(calls[0]).toContain('args=secret set DOTENV_PRIVATE_KEY')
    expect(calls[1]).toContain('--app dependabot')
    expect(calls[2]).toContain('env add DOTENV_PRIVATE_KEY production')
    expect(calls[3]).toContain('env add DOTENV_PRIVATE_KEY preview')
    for (const call of calls.slice(2)) expect(call).toContain('--force')
  })

  it('also pushes the .env.production key when that file exists', () => {
    const project = makeProject({
      files: { '.env': 'A="1"\n', '.env.production': 'A="2"\n' },
    })
    const { exitCode, calls } = run(project)

    expect(exitCode).toBe(0)
    expect(calls).toHaveLength(8)
    expect(
      calls.filter((call) => call.includes('DOTENV_PRIVATE_KEY_PRODUCTION'))
    ).toHaveLength(4)
  })

  it('fails, and pushes nothing, without an encrypted .env', () => {
    expect(run(makeProject({ files: {} })).exitCode).toBe(1)

    const plain = run(makeProject({ encrypt: false }))
    expect(plain.exitCode).toBe(1)
    expect(plain.calls).toEqual([])
  })

  it('fails, and pushes nothing, when the private key is not on this machine', () => {
    const project = makeProject()
    rmSync(join(project.root, '.env.keys'))
    const { exitCode, calls } = run(project)

    expect(exitCode).toBe(1)
    expect(calls).toEqual([])
  })

  it('exits 1 when a destination is skipped or fails, with the key redacted', () => {
    const unlinked = run(makeProject({ linkVercel: false }))
    expect(unlinked.exitCode).toBe(1)
    expect(unlinked.output).toContain('vercel link')

    const project = makeProject({ ghExitCode: 1 })
    const key = keyOf(project.root, 'DOTENV_PRIVATE_KEY')
    const failing = run(project)
    expect(failing.exitCode).toBe(1)
    expect(failing.output).not.toContain(key)

    expect(
      run(makeProject({ linkVercel: false }), ['--skip-vercel']).exitCode
    ).toBe(0)
  })
})
