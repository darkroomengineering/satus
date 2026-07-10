/**
 * Unit tests for payload source readers (`setup:project`'s additive re-add
 * step, via `installBundle` in `bundle-installer.ts`).
 *
 * Run with: bun test lib/scripts/payload-source.test.ts
 *
 * Network-free: constructs a `PayloadSource` pointing at this repo's own
 * checkout (no resolution step to exercise — `setup:project` builds its own
 * local snapshot instead).
 */

import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import {
  listPayloadFiles,
  type PayloadSource,
  payloadPathExists,
  readPayloadFile,
  readPayloadPackageJson,
} from './payload-source'

/** A payload source pointing at this repo checkout, for reader tests. */
const repoSource: PayloadSource = {
  root: process.cwd(),
  label: 'this repo checkout',
  cleanup: async () => {},
}

describe('payload readers (against the repo itself)', () => {
  it('reads files and detects existing paths', async () => {
    expect(await payloadPathExists(repoSource, 'next.config.ts')).toBe(true)
    expect(await payloadPathExists(repoSource, 'not/a/real/file.ts')).toBe(
      false
    )

    const text = await readPayloadFile(repoSource, 'next.config.ts')
    expect(text).toContain('nextConfig')
  })

  it('fails loudly when reading a missing file', async () => {
    await expect(
      readPayloadFile(repoSource, 'not/a/real/file.ts')
    ).rejects.toThrow('missing')
  })

  it('reads the payload package.json for version pinning', async () => {
    const pkg = await readPayloadPackageJson(repoSource)

    expect(pkg.dependencies?.next).toBeTruthy()
    expect(pkg.devDependencies?.['ts-morph']).toBeTruthy()
  })

  it('lists folder files recursively, relative to the payload root', async () => {
    const files = await listPayloadFiles(repoSource, 'lib/integrations/hubspot')

    expect(files).toContain('lib/integrations/hubspot/action.ts')
    expect(files).toContain('lib/integrations/hubspot/embed/index.tsx')
    // Sorted, deterministic output
    expect([...files].sort()).toEqual(files)
  })

  it('fails loudly when listing a missing folder', async () => {
    await expect(
      listPayloadFiles(repoSource, 'lib/integrations/nope')
    ).rejects.toThrow('missing folder')
  })

  it('sanity check: payload root resolves real files via join', async () => {
    expect(await Bun.file(join(repoSource.root, 'package.json')).exists()).toBe(
      true
    )
  })
})
