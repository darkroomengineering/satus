/**
 * Unit tests for payload source resolution (`satus add`).
 *
 * Run with: bun test lib/scripts/payload-source.test.ts
 *
 * Network-free: only the local-path (`--from`) resolution and the pure
 * helpers are covered here. The tarball path is exercised in the Phase 3
 * round-trip e2e.
 */

import { describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  listPayloadFiles,
  payloadPathExists,
  pickRef,
  readPayloadFile,
  readPayloadPackageJson,
  readPinnedRef,
  resolvePayloadSource,
  tarballUrl,
} from './payload-source'

describe('pickRef', () => {
  it('prefers the explicit --ref', () => {
    expect(pickRef('v2.0.1', 'abc123')).toEqual({
      ref: 'v2.0.1',
      origin: 'explicit',
    })
  })

  it('falls back to the pinned ref', () => {
    expect(pickRef(undefined, 'abc123')).toEqual({
      ref: 'abc123',
      origin: 'pinned',
    })
  })

  it('defaults to main when nothing is pinned', () => {
    expect(pickRef(undefined, undefined)).toEqual({
      ref: 'main',
      origin: 'default',
    })
  })
})

describe('tarballUrl', () => {
  it('builds the codeload URL for a ref', () => {
    expect(tarballUrl('main')).toBe(
      'https://codeload.github.com/darkroomengineering/satus/tar.gz/main'
    )
  })

  it('supports sha refs', () => {
    expect(tarballUrl('6f49149')).toBe(
      'https://codeload.github.com/darkroomengineering/satus/tar.gz/6f49149'
    )
  })
})

describe('readPinnedRef', () => {
  it('reads the pinned ref from package.json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'satus-test-'))
    try {
      await Bun.write(
        join(dir, 'package.json'),
        JSON.stringify({ satus: { ref: 'abc123' } })
      )
      expect(await readPinnedRef(dir)).toBe('abc123')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('returns undefined when package.json has no satus.ref', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'satus-test-'))
    try {
      await Bun.write(join(dir, 'package.json'), JSON.stringify({ name: 'x' }))
      expect(await readPinnedRef(dir)).toBeUndefined()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('returns undefined when no package.json exists', async () => {
    expect(await readPinnedRef('/definitely/not/a/real/path')).toBeUndefined()
  })
})

describe('resolvePayloadSource (local path)', () => {
  it('resolves --from to the absolute checkout root with a no-op cleanup', async () => {
    const source = await resolvePayloadSource({ from: '.' })

    expect(source.root).toBe(process.cwd())
    expect(source.label).toContain('local checkout')
    expect(await Bun.file(join(source.root, 'package.json')).exists()).toBe(
      true
    )

    // cleanup must be a harmless no-op for local checkouts
    await source.cleanup()
    expect(await Bun.file(join(source.root, 'package.json')).exists()).toBe(
      true
    )
  })

  it('fails loudly when the path does not exist', async () => {
    await expect(
      resolvePayloadSource({ from: './definitely-not-here-xyz' })
    ).rejects.toThrow('does not exist')
  })

  it('fails loudly when the path is not a satus checkout', async () => {
    // ./app exists but has no package.json
    await expect(resolvePayloadSource({ from: './app' })).rejects.toThrow(
      'package.json'
    )
  })
})

describe('payload readers (against the repo itself)', () => {
  it('reads files and detects existing paths', async () => {
    const source = await resolvePayloadSource({ from: '.' })

    expect(await payloadPathExists(source, 'next.config.ts')).toBe(true)
    expect(await payloadPathExists(source, 'not/a/real/file.ts')).toBe(false)

    const text = await readPayloadFile(source, 'next.config.ts')
    expect(text).toContain('nextConfig')
  })

  it('fails loudly when reading a missing file', async () => {
    const source = await resolvePayloadSource({ from: '.' })
    await expect(readPayloadFile(source, 'not/a/real/file.ts')).rejects.toThrow(
      'missing'
    )
  })

  it('reads the payload package.json for version pinning', async () => {
    const source = await resolvePayloadSource({ from: '.' })
    const pkg = await readPayloadPackageJson(source)

    expect(pkg.dependencies?.next).toBeTruthy()
    expect(pkg.devDependencies?.['ts-morph']).toBeTruthy()
  })

  it('lists folder files recursively, relative to the payload root', async () => {
    const source = await resolvePayloadSource({ from: '.' })
    const files = await listPayloadFiles(source, 'lib/integrations/hubspot')

    expect(files).toContain('lib/integrations/hubspot/action.ts')
    expect(files).toContain('lib/integrations/hubspot/embed/index.tsx')
    // Sorted, deterministic output
    expect([...files].sort()).toEqual(files)
  })

  it('fails loudly when listing a missing folder', async () => {
    const source = await resolvePayloadSource({ from: '.' })
    await expect(
      listPayloadFiles(source, 'lib/integrations/nope')
    ).rejects.toThrow('missing folder')
  })
})
