import { expect } from 'bun:test'
import { symlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { INTEGRATION_BUNDLES } from './integration-bundles'
import { pathExists, projectRoot } from './utils'

/**
 * Copies the repo to `tmpRoot` for tests that run the real scripts, leaving out
 * `node_modules`, `.next` and `.git` (no `.git` makes prepare.ts's lefthook step
 * a no-op), then links the nearest real `node_modules` (found by walking up from
 * `projectRoot`, since a git worktree has none of its own) so the copy resolves
 * packages offline. Throws when none exists: without the link Bun falls back to
 * auto-install, which needs the network and fails on some Bun versions.
 *
 * `.satus-*` is excluded because the M7 tests create scratch directories with
 * that prefix inside projectRoot, some chmod 0o555, while other test files copy
 * the repo in parallel: copying one in would make the copy's cleanup fail.
 */
export async function copyRepo(tmpRoot: string): Promise<void> {
  const rsync = Bun.spawnSync([
    'rsync',
    '-a',
    '--exclude',
    'node_modules',
    '--exclude',
    '.next',
    '--exclude',
    '.git',
    '--exclude',
    '.satus-*',
    `${projectRoot}/`,
    `${tmpRoot}/`,
  ])
  expect(rsync.exitCode).toBe(0)

  for (let dir = projectRoot; dir !== dirname(dir); dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules')
    if (await pathExists(candidate)) {
      await symlink(candidate, join(tmpRoot, 'node_modules'))
      return
    }
  }
  throw new Error(`copyRepo: no node_modules found above ${projectRoot}`)
}

// Source fixtures: loaded once per test file by `loadSourceFiles`, never
// written to disk.
export const sourceFiles: Record<string, string> = {}
export async function loadSourceFiles(): Promise<void> {
  const filesToLoad = new Set<string>()

  for (const bundle of Object.values(INTEGRATION_BUNDLES)) {
    for (const transform of bundle.codeTransforms) {
      filesToLoad.add(transform.file)
    }
    for (const transform of bundle.addTransforms ?? []) {
      filesToLoad.add(transform.file)
    }
  }

  for (const file of filesToLoad) {
    try {
      sourceFiles[file] = await Bun.file(file).text()
    } catch {
      sourceFiles[file] = ''
    }
  }
}
