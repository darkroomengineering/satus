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
 * 3. Vercel is missing, unlinked or rejects the key and the script still exits 0
 * 4. .env is missing, or has any plain value, and the script carries on
 * 5. the key is not on this machine and something (e.g. "null") gets pushed
 * 6. .env.production exists but only DOTENV_PRIVATE_KEY is pushed
 * 7. Vercel gets production but not preview
 * 8. an existing Vercel variable is not overwritten (rotating the key fails)
 * 9. the run doesn't say which Vercel project it writes to
 * 10. --copy misses a key, prints one, or pushes to Vercel
 *
 * `vercel` and the clipboard commands are fakes that log what they receive.
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
  vercelExitCode?: number
}

function fake(path: string, body: string) {
  writeFileSync(path, `#!/bin/sh\n${body}\n`)
  chmodSync(path, 0o755)
}

function makeProject({
  files = { '.env': 'SECRET="s3cret"\n' },
  encrypt = true,
  linkVercel = true,
  vercelExitCode = 0,
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
    writeFileSync(
      join(root, '.vercel', 'project.json'),
      '{"projectId":"prj_1","projectName":"my-site"}'
    )
  }

  const bin = join(root, 'fake-bin')
  mkdirSync(bin)
  const log = join(root, 'calls.log')
  const clipboard = join(root, 'clipboard.txt')
  // A failing fake echoes the key back, the way a CLI error message might.
  fake(
    join(bin, 'vercel'),
    `in="$(cat)"\nprintf 'args=%s stdin=%s\\n' "$*" "$in" >> "${log}"\n` +
      `[ ${vercelExitCode} -ne 0 ] && echo "rejected $in" >&2\nexit ${vercelExitCode}`
  )
  for (const name of ['pbcopy', 'xclip', 'xsel', 'clip']) {
    fake(join(bin, name), `cat > "${clipboard}"`)
  }
  return { root, bin, log, clipboard }
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
  it('pipes the key to Vercel production and preview on stdin, never printing it', () => {
    const project = makeProject()
    const key = keyOf(project.root, 'DOTENV_PRIVATE_KEY')
    const { exitCode, output, calls } = run(project)

    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(exitCode).toBe(0)
    expect(output).not.toContain(key)
    expect(output).toContain('my-site')
    expect(calls).toHaveLength(2)
    expect(calls[0]).toContain('args=env add DOTENV_PRIVATE_KEY production')
    expect(calls[1]).toContain('args=env add DOTENV_PRIVATE_KEY preview')
    for (const call of calls) {
      expect(call.split(' stdin=')[0]).not.toContain(key)
      expect(call).toEndWith(`stdin=${key}`)
      expect(call).toContain('--force')
    }
  })

  it('names the Vercel project in a dry run and pushes nothing', () => {
    const { exitCode, output, calls } = run(makeProject(), ['--dry-run'])

    expect(exitCode).toBe(0)
    expect(output).toContain('my-site')
    expect(calls).toEqual([])
  })

  it('also pushes the .env.production key when that file exists', () => {
    const project = makeProject({
      files: { '.env': 'A="1"\n', '.env.production': 'A="2"\n' },
    })
    const { exitCode, calls } = run(project)

    expect(exitCode).toBe(0)
    expect(calls).toHaveLength(4)
    expect(
      calls.filter((call) => call.includes('DOTENV_PRIVATE_KEY_PRODUCTION'))
    ).toHaveLength(2)
  })

  it('fails, and pushes nothing, without a fully encrypted .env', () => {
    expect(run(makeProject({ files: {} })).exitCode).toBe(1)

    const plain = run(makeProject({ encrypt: false }))
    expect(plain.exitCode).toBe(1)
    expect(plain.calls).toEqual([])

    const partial = makeProject()
    const envPath = join(partial.root, '.env')
    writeFileSync(envPath, `${readFileSync(envPath, 'utf8')}LATER="plain"\n`)
    const partialRun = run(partial)
    expect(partialRun.exitCode).toBe(1)
    expect(partialRun.output).toContain('LATER')
    expect(partialRun.calls).toEqual([])
  })

  it('fails, and pushes nothing, when the private key is not on this machine', () => {
    const project = makeProject()
    rmSync(join(project.root, '.env.keys'))
    const { exitCode, calls } = run(project)

    expect(exitCode).toBe(1)
    expect(calls).toEqual([])
  })

  it('exits 1 when Vercel is unlinked or rejects the key, with the key redacted', () => {
    const unlinked = run(makeProject({ linkVercel: false }))
    expect(unlinked.exitCode).toBe(1)
    expect(unlinked.output).toContain('vercel link')

    const project = makeProject({ vercelExitCode: 1 })
    const key = keyOf(project.root, 'DOTENV_PRIVATE_KEY')
    const failing = run(project)
    expect(failing.exitCode).toBe(1)
    expect(failing.output).not.toContain(key)
  })

  it('--copy puts every key line on the clipboard, prints none, pushes nothing', () => {
    const project = makeProject({
      files: { '.env': 'A="1"\n', '.env.production': 'A="2"\n' },
      linkVercel: false,
    })
    const key = keyOf(project.root, 'DOTENV_PRIVATE_KEY')
    const productionKey = keyOf(project.root, 'DOTENV_PRIVATE_KEY_PRODUCTION')
    const { exitCode, output, calls } = run(project, ['--copy'])

    expect(exitCode).toBe(0)
    expect(output).not.toContain(key)
    expect(output).not.toContain(productionKey)
    expect(calls).toEqual([])
    expect(readFileSync(project.clipboard, 'utf8')).toBe(
      `DOTENV_PRIVATE_KEY="${key}"\nDOTENV_PRIVATE_KEY_PRODUCTION="${productionKey}"\n`
    )
  })
})
