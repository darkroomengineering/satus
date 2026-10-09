import { describe, expect, it } from 'bun:test'

/**
 * Committed env files are encrypted with dotenvx. What has to hold:
 * - every value in what git will commit is encrypted, so nothing is readable
 *   without the key. Read from the index, not the working tree: encrypting a
 *   file after staging its plain version must still fail
 * - only the root .env and its .env.development / .env.production overrides
 *   are committed, never .env.keys, .env*.local or a nested .env
 * - the @next/env that Next loads is the same dotenvx release as
 *   @dotenvx/next-env, so the override can't drift from the dependency
 *
 * The pre-commit hook runs this file whenever an env file is staged.
 */

const COMMITTABLE = new Set(['.env', '.env.development', '.env.production'])

function git(...args: string[]) {
  return Bun.spawnSync(['git', ...args]).stdout.toString()
}

const tracked = git('ls-files', '--', ':(glob)**/.env*')
  .split('\n')
  .filter((file) => file && !file.endsWith('.env.example'))

function parse(source: string) {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const separator = line.indexOf('=')
      const value = line.slice(separator + 1).replace(/^["']|["']$/g, '')
      return { key: line.slice(0, separator), value }
    })
}

interface PackageManifest {
  name: string
  version: string
}

async function versionOf(manifest: string) {
  const { name, version }: PackageManifest = await Bun.file(manifest).json()
  return `${name}@${version}`
}

describe('committed env files', () => {
  it('are only the root .env and its overrides', () => {
    expect(tracked.filter((file) => !COMMITTABLE.has(file))).toEqual([])
  })

  for (const file of tracked.filter((entry) => COMMITTABLE.has(entry))) {
    it(`${file} encrypts every value`, () => {
      const staged = git('show', `:${file}`)

      expect(
        parse(staged)
          .filter(
            ({ key, value }) =>
              !key.startsWith('DOTENV_PUBLIC_KEY') &&
              !value.startsWith('encrypted:')
          )
          .map(({ key }) => key)
      ).toEqual([])
    })
  }
})

describe('dotenvx wiring', () => {
  it('loads @next/env from the installed @dotenvx/next-env release', async () => {
    expect(await versionOf('node_modules/@next/env/package.json')).toBe(
      await versionOf('node_modules/@dotenvx/next-env/package.json')
    )
  })
})
