import { describe, expect, it } from 'bun:test'

/**
 * Committed env files are encrypted with dotenvx. What has to hold:
 * - every value is encrypted, so nothing is readable without the key
 * - private keys (.env.keys) and .env*.local files never get committed
 */

const tracked = Bun.spawnSync(['git', 'ls-files', '.env*'])
  .stdout.toString()
  .split('\n')
  .filter(Boolean)

const committedEnvFiles = tracked.filter((file) => file !== '.env.example')

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

describe('committed env files', () => {
  it('include no private keys or plain local files', () => {
    expect(
      committedEnvFiles.filter(
        (file) =>
          !['.env', '.env.development', '.env.production'].includes(file)
      )
    ).toEqual([])
  })

  for (const file of committedEnvFiles) {
    it(`${file} encrypts every value`, async () => {
      const entries = parse(await Bun.file(file).text())

      expect(
        entries
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
