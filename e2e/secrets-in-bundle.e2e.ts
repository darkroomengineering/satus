import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

// ci.yml's e2e step sets each server secret in lib/env.ts to `leakcheck-<NAME>`
// before the build. SITE_PASSWORD is excluded: set, it gates `next start` and
// every spec gets a 401.
const SECRETS = [
  ...readFileSync('lib/env.ts', 'utf8').matchAll(
    /^\s+([A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|_KEY)):/gm
  ),
]
  .map((match) => match[1] ?? '')
  .filter(
    (name) => !name.startsWith('NEXT_PUBLIC_') && name !== 'SITE_PASSWORD'
  )

function browserFiles(): string[] {
  const list = (dir: string) =>
    readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name))
  return [
    ...list('.next/static'),
    ...list('.next/server/app').filter((file) => /\.(html|rsc)$/.test(file)),
  ]
}

test('server secrets never reach browser-delivered build output', async () => {
  const unset = SECRETS.filter(
    (name) => process.env[name] !== `leakcheck-${name}`
  )
  test.skip(
    !process.env.CI && unset.length === SECRETS.length,
    'no leakcheck-* values set; CI sets them'
  )
  expect(SECRETS.length).toBeGreaterThan(0)
  expect(unset, 'secrets missing a leakcheck value in ci.yml').toEqual([])

  const files = browserFiles()
  const leaks = files.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/leakcheck-([A-Z0-9_]+)/g)].map(
      (match) => `${match[1]} in ${file}`
    )
  )

  await test.info().attach('secrets-in-bundle', {
    body: JSON.stringify(
      { scannedFiles: files.length, SECRETS, leaks },
      null,
      2
    ),
    contentType: 'application/json',
  })
  expect(files.length).toBeGreaterThan(0)
  expect(leaks).toEqual([])
})
