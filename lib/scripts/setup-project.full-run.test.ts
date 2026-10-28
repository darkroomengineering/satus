import { describe, expect, it } from 'bun:test'
import { chmod, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { addScripts } from './bundle-installer'
import { INTEGRATION_BUNDLES } from './integration-bundles'
import { SETUP_PROJECT_PRUNED_STUB } from './setup-project'
import { copyRepo } from './setup-project.test-helpers'
import { pathExists } from './utils'

// A kept bundle's dependency pins must survive selfPrune's package.json write.
// Step 8's `addDependencies` read-modify-writes package.json on disk, and a
// selfPrune that reused the step-5 in-memory `pkg` would revert every pin:
// `--keep sanity` would report "N dependencies pinned" while the file ended up
// with none, and the build failed on module-not-found.
//
// Runs the REAL script end-to-end on a throwaway copy of the repo (node_modules
// symlinked), non-interactively with --skip-install. It proves only the
// on-disk package.json, not that `bun install`/`bun run build` succeed.

describe("P-C3 regression: kept bundle deps survive selfPrune's package.json write", () => {
  it('--keep sanity pins sanity deps to disk through a full (non-dry) run', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-fullrun-'))
    try {
      await copyRepo(tmpRoot)

      const proc = Bun.spawnSync(
        [
          'bun',
          'run',
          'lib/scripts/setup-project.ts',
          '--keep',
          'sanity',
          '--yes',
          '--skip-install',
        ],
        { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
      )

      if (proc.exitCode !== 0) {
        console.error(proc.stdout.toString())
        console.error(proc.stderr.toString())
      }
      expect(proc.exitCode).toBe(0)

      const pkg = JSON.parse(
        await Bun.file(join(tmpRoot, 'package.json')).text()
      ) as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
        scripts?: Record<string, string>
      }

      for (const dep of [
        '@portabletext/react',
        '@sanity/asset-utils',
        '@sanity/client',
        '@sanity/image-url',
        'next-sanity',
      ]) {
        expect(
          pkg.dependencies?.[dep],
          `missing dependency "${dep}"`
        ).toBeTruthy()
      }
      for (const devDep of [
        '@sanity/icons',
        'sanity',
        'sanity-plugin-link-field',
        'styled-components',
      ]) {
        expect(
          pkg.devDependencies?.[devDep],
          `missing devDependency "${devDep}"`
        ).toBeTruthy()
      }

      // Self-prune replaces (not deletes) the setup:project entry with a
      // non-zero-exit stub, while the script file itself is really deleted.
      expect(pkg.scripts?.['setup:project']).toBe(SETUP_PROJECT_PRUNED_STUB)
      expect(
        await pathExists(join(tmpRoot, 'lib/scripts/setup-project.ts'))
      ).toBe(false)

      // The strip pass removes the sanity:* scripts; the re-add must put
      // them back, with the file sanity:mcp runs.
      const sourcePkg = (await Bun.file('package.json').json()) as {
        scripts: Record<string, string>
      }
      for (const name of INTEGRATION_BUNDLES.sanity.scripts ?? []) {
        expect(pkg.scripts?.[name], `missing script "${name}"`).toBe(
          sourcePkg.scripts[name]
        )
      }
      expect(
        await pathExists(join(tmpRoot, 'lib/scripts/copy-sanity-mcp.ts'))
      ).toBe(true)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 60000)

  it('--keep shopify drops the sanity:* scripts with the Sanity files', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-strip-scripts-'))
    try {
      await copyRepo(tmpRoot)

      const proc = Bun.spawnSync(
        [
          'bun',
          'run',
          'lib/scripts/setup-project.ts',
          '--keep',
          'shopify',
          '--yes',
          '--skip-install',
        ],
        { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
      )
      if (proc.exitCode !== 0) {
        console.error(proc.stdout.toString())
        console.error(proc.stderr.toString())
      }
      expect(proc.exitCode).toBe(0)

      const pkg = (await Bun.file(join(tmpRoot, 'package.json')).json()) as {
        scripts?: Record<string, string>
      }
      const leftovers = Object.keys(pkg.scripts ?? {}).filter((name) =>
        name.startsWith('sanity:')
      )
      expect(leftovers).toEqual([])
      expect(
        await pathExists(join(tmpRoot, 'lib/scripts/copy-sanity-mcp.ts'))
      ).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 60000)
})

describe('addScripts', () => {
  // setup:project's payload is the project's own pre-strip package.json, so
  // a declared script missing there is one the fork deleted. Throwing would
  // abort installBundle after setupLean already stripped the bundle and
  // leave it half re-added; the script is skipped instead.
  it('skips a declared script the payload package.json lacks', async () => {
    const promise = addScripts(
      INTEGRATION_BUNDLES.sanity,
      { scripts: { 'sanity:extract': 'x' } },
      { dryRun: true }
    )
    await expect(promise).resolves.toBeArray()
  })

  it('--keep sanity on a fork without sanity:mcp still re-adds the rest of the bundle', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-missing-script-'))
    try {
      await copyRepo(tmpRoot)
      const pkgPath = join(tmpRoot, 'package.json')
      const before = (await Bun.file(pkgPath).json()) as {
        scripts: Record<string, string>
      }
      delete before.scripts['sanity:mcp']
      await Bun.write(pkgPath, `${JSON.stringify(before, null, 2)}\n`)

      const proc = Bun.spawnSync(
        [
          'bun',
          'run',
          'lib/scripts/setup-project.ts',
          '--keep',
          'sanity',
          '--yes',
          '--skip-install',
        ],
        { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
      )
      if (proc.exitCode !== 0) {
        console.error(proc.stdout.toString())
        console.error(proc.stderr.toString())
      }
      expect(proc.exitCode).toBe(0)

      const pkg = (await Bun.file(pkgPath).json()) as {
        scripts?: Record<string, string>
      }
      expect(pkg.scripts?.['sanity:extract']).toBe(
        before.scripts['sanity:extract']
      )
      expect(pkg.scripts?.['sanity:typegen']).toBe(
        before.scripts['sanity:typegen']
      )
      expect(pkg.scripts?.['sanity:mcp']).toBeUndefined()
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 60000)
})

// issue #382: selfPrune must not run when steps 6/8 collected (non-thrown)
// transform failures, or it deletes this script before the caller reports them,
// breaking the "just re-run it" recovery.
//
// Runs the REAL script end-to-end on a throwaway copy with one codeTransform
// target made unreadable (EACCES): a plain fs error that `applyCodeTransforms`
// collects, not a `RequiredOpMatchError`.

describe('issue #382: selfPrune is gated on collected transform failures', () => {
  // chmod 000 is a no-op permission check for uid 0 (root can read anything
  // regardless of mode bits) — some CI containers run as root, where this
  // wouldn't reproduce the failure it's testing for.
  const isRoot = (process.getuid?.() ?? -1) === 0

  it.skipIf(isRoot)(
    'a collected (non-thrown) transform failure keeps setup-project.ts and its package.json script entry intact',
    async () => {
      const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-collected-failure-'))
      const targetFile = join(tmpRoot, 'app/api/revalidate/route.ts')
      try {
        await copyRepo(tmpRoot)

        // `--keep ''` strips every integration, so the lean pass transforms the
        // shared revalidate route. Removing its read permission makes
        // `applyCodeTransforms` hit a genuine EACCES from `file.text()`, a plain
        // Error collected into `failures` whether or not the op was `required`.
        await chmod(targetFile, 0o000)

        const proc = Bun.spawnSync(
          [
            'bun',
            'run',
            'lib/scripts/setup-project.ts',
            '--keep',
            '',
            '--yes',
            '--skip-install',
          ],
          { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
        )

        if (proc.exitCode !== 3) {
          console.error(proc.stdout.toString())
          console.error(proc.stderr.toString())
        }
        expect(proc.exitCode).toBe(3)

        // The script and its package.json entry survive, so it can be re-run.
        expect(
          await pathExists(join(tmpRoot, 'lib/scripts/setup-project.ts'))
        ).toBe(true)

        const pkg = JSON.parse(
          await Bun.file(join(tmpRoot, 'package.json')).text()
        ) as { scripts?: Record<string, string> }
        expect(pkg.scripts?.['setup:project']).not.toBe(
          SETUP_PROJECT_PRUNED_STUB
        )
        expect(pkg.scripts?.['test:setup']).toBeTruthy()
      } finally {
        await chmod(targetFile, 0o644).catch(() => undefined)
        await rm(tmpRoot, { recursive: true, force: true })
      }
    },
    60000
  )
})

// Issue #392: app/(site)/(examples) (the Sanity wiring tutorial at `/sanity`)
// must never ship, regardless of which integrations are kept. A run that
// keeps Sanity, the common case, is the one that regresses without this test.
// Same end-to-end harness as the dependency-pins test above.

describe('Issue #392: app/(site)/(examples) is pruned unconditionally', () => {
  it('--keep sanity still deletes app/(site)/(examples)', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-prune-examples-'))
    try {
      await copyRepo(tmpRoot)

      expect(
        await pathExists(join(tmpRoot, 'app/(site)/(examples)')),
        'fixture sanity check: app/(site)/(examples) should exist before setup runs'
      ).toBe(true)

      const proc = Bun.spawnSync(
        [
          'bun',
          'run',
          'lib/scripts/setup-project.ts',
          '--keep',
          'sanity',
          '--yes',
          '--skip-install',
        ],
        { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
      )

      if (proc.exitCode !== 0) {
        console.error(proc.stdout.toString())
        console.error(proc.stderr.toString())
      }
      expect(proc.exitCode).toBe(0)

      expect(await pathExists(join(tmpRoot, 'app/(site)/(examples)'))).toBe(
        false
      )
      // The catch-all that replaces app/(site)/[...unmatched] must survive —
      // it's the in-chrome 404 handler, not part of the example group.
      expect(
        await pathExists(join(tmpRoot, 'app/(site)/[...slug]/page.tsx'))
      ).toBe(true)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 60000)
})
