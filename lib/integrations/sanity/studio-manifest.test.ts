/**
 * Studio manifest invariant
 *
 * The Sanity CLI (`sanity dev`, `sanity build`, `sanity deploy`) runs from
 * this folder and reads `./package.json` before it starts: it refuses to
 * start without the file, and without `styled-components` declared in it. The
 * root `package.json` is what actually installs both, so this folder's
 * manifest only restates them. It breaks when:
 *
 *  1. the folder manifest is deleted, so the CLI fails on startup;
 *  2. the root stops declaring a package the folder declares, so it may no
 *     longer be installed;
 *  3. a major bump installs a version outside the folder's range, which the
 *     CLI reports as unsupported.
 *
 * Minor bumps of the root range need no change here: the installed version
 * still satisfies the folder's caret range.
 */

import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const STUDIO_DIR = import.meta.dir
const ROOT_DIR = join(STUDIO_DIR, '../../..')

interface Manifest {
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

async function readManifest(dir: string): Promise<Manifest> {
  return Bun.file(join(dir, 'package.json')).json()
}

function declared(manifest: Manifest) {
  return { ...manifest.dependencies, ...manifest.devDependencies }
}

describe('Studio folder package.json', () => {
  it('exists, because the Sanity CLI refuses to start without it', () => {
    expect(existsSync(join(STUDIO_DIR, 'package.json'))).toBe(true)
  })

  it('declares sanity and styled-components', async () => {
    const studio = declared(await readManifest(STUDIO_DIR))
    expect(studio.sanity).toBeDefined()
    expect(studio['styled-components']).toBeDefined()
  })

  it('only declares packages the root installs, at versions its ranges accept', async () => {
    const studio = declared(await readManifest(STUDIO_DIR))
    const root = declared(await readManifest(ROOT_DIR))

    for (const [name, range] of Object.entries(studio)) {
      expect(root[name], `root package.json must declare ${name}`).toBeDefined()

      const { version: installed } = await readManifest(
        join(ROOT_DIR, 'node_modules', name)
      )
      expect(installed, `${name} must be installed`).toBeDefined()
      expect(
        Bun.semver.satisfies(installed ?? '', range),
        `installed ${name}@${installed} is outside the Studio range ${range}`
      ).toBe(true)
    }
  })
})
