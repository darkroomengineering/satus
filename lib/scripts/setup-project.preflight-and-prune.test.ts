import { describe, expect, it } from 'bun:test'
import { chmod, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  getIntegrationEntries,
  getIntegrationNames,
  INTEGRATION_BUNDLES,
} from './integration-bundles'
import type { PayloadSource } from './payload-source'
import {
  codeTransformTargetPaths,
  collectSelfPruneTestFiles,
  declaredBundlePaths,
  findMissingPaths,
  resolveTransitiveKeepSet,
  SELF_PRUNE_KEEP_TEST_FILES,
  setupAddIntegrations,
  updateBarrelExports,
} from './setup-project'
import { pathExists, projectRoot, removeDir, removeFile } from './utils'

// resolveTransitiveKeepSet: transitive `requires` resolution (`--keep theatre`
// once stripped webgl out from under it).

describe('resolveTransitiveKeepSet', () => {
  it('resolves a standalone integration to itself', () => {
    expect(resolveTransitiveKeepSet(['sanity'])).toEqual({
      order: ['sanity'],
      implied: [],
    })
  })

  it('pulls in required integrations before the requester (theatre → webgl)', () => {
    const { order, implied } = resolveTransitiveKeepSet(['theatre'])

    expect(order).toEqual(['webgl', 'theatre'])
    expect(implied).toEqual(['webgl'])
  })

  it('does not mark explicitly requested dependencies as implied', () => {
    const { order, implied } = resolveTransitiveKeepSet(['theatre', 'webgl'])

    expect(order).toEqual(['webgl', 'theatre'])
    expect(implied).toEqual([])
  })

  it('deduplicates repeated requests', () => {
    const { order } = resolveTransitiveKeepSet(['webgl', 'webgl', 'theatre'])
    expect(order).toEqual(['webgl', 'theatre'])
  })

  it('fails loudly on unknown integration ids', () => {
    expect(() => resolveTransitiveKeepSet(['sanityy'])).toThrow(
      'Unknown integration "sanityy"'
    )
  })

  it('leaves an empty (lean) keep set untouched', () => {
    expect(resolveTransitiveKeepSet([])).toEqual({ order: [], implied: [] })
  })
})

// Preflight validation before any mutation.
describe('declaredBundlePaths / findMissingPaths (H8 preflight)', () => {
  it('declaredBundlePaths collects folders, files, and overwriteFiles for kept bundles', () => {
    const paths = declaredBundlePaths(['sanity'])

    expect(paths).toContain('lib/integrations/sanity')
    expect(paths).toContain('app/api/draft-mode/enable/route.ts')
    expect(paths).toContain('app/(site)/layout.tsx')
  })

  it('sanity bundle owns every route folder that imports from it', () => {
    // These routes import from lib/integrations/sanity. If they fall out of
    // the bundle, a fork that drops Sanity keeps them and fails to build on
    // module-not-found. app/(site)/(examples)/sanity is NOT here: setup:project
    // prunes it unconditionally (see the pruneExampleRoutes tests).
    const paths = declaredBundlePaths(['sanity'])
    expect(paths).toContain('app/(site)/articles')
    expect(paths).toContain('app/studio')
    // The in-chrome 404 handler is stripped in place (codeTransforms), not
    // deleted with the bundle — it's declared via overwriteFiles instead.
    expect(paths).toContain('app/(site)/[...slug]/page.tsx')
  })

  it('shopify bundle owns every route folder that imports from it', () => {
    // app/api/cart/ensure imports lib/integrations/shopify's cart operations;
    // the same lean-fork break the sanity assertions above guard against.
    const paths = declaredBundlePaths(['shopify'])
    expect(paths).toContain('lib/integrations/shopify')
    expect(paths).toContain('app/api/cart')
  })

  it('declaredBundlePaths is empty for an empty keep set', () => {
    expect(declaredBundlePaths([])).toEqual([])
  })

  it('findMissingPaths reports nothing missing when every real bundle path exists on disk', async () => {
    // Runs against the real repo tree: every declared path must be present.
    for (const id of getIntegrationNames()) {
      const missing = await findMissingPaths(declaredBundlePaths([id]))
      expect(missing).toEqual([])
    }
  })

  it('findMissingPaths reports paths an injected exists-check says are absent', async () => {
    const missing = await findMissingPaths(
      ['fake/path/a', 'fake/path/b', 'fake/path/c'],
      async (rel) => rel !== 'fake/path/b' // only "b" is reported missing
    )

    expect(missing).toEqual(['fake/path/b'])
  })

  it('findMissingPaths returns [] when the injected exists-check always resolves', async () => {
    const missing = await findMissingPaths(['a', 'b'], async () => true)
    expect(missing).toEqual([])
  })
})

// issue #389: preflight also covers codeTransform target files. They run
// unconditionally (setupLean's strip pass touches every bundle), so an absent
// shared file must fail the preflight even when no bundle declares it in
// folders/files.

describe('codeTransformTargetPaths (issue #389 preflight)', () => {
  it('collects the target file of every bundle codeTransform', () => {
    const paths = codeTransformTargetPaths([])

    // A cross-bundle shared file: not in any bundle's folders/files, so
    // declaredBundlePaths alone would never notice it going missing.
    expect(paths).toContain('app/api/revalidate/route.ts')
  })

  it('is deduplicated', () => {
    const paths = codeTransformTargetPaths([])
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('findMissingPaths reports nothing missing against the real repo tree', async () => {
    // Runs against the real repo tree: every codeTransform target must be present.
    const missing = await findMissingPaths(codeTransformTargetPaths([]))
    expect(missing).toEqual([])
  })

  it('a deleted transform-target file fails the preflight before any mutation', async () => {
    const paths = codeTransformTargetPaths([])
    const deletedFile = paths[0]
    if (!deletedFile)
      throw new Error('expected at least one codeTransform path')

    const missing = await findMissingPaths(
      paths,
      async (rel) => rel !== deletedFile
    )

    expect(missing).toEqual([deletedFile])
  })

  // addTransforms only run for KEPT bundles (via installBundle, step 8), so the
  // preflight must walk their targets too. Today every addTransforms target
  // coincides with some bundle's codeTransforms target, so a gap would be
  // silent; this pins the contract so a FUTURE addTransforms-only target fails
  // loudly here instead of wedging setupAddIntegrations mid-run.
  it('includes every kept bundle addTransforms target file (L16)', () => {
    for (const [id, bundle] of getIntegrationEntries()) {
      const addTransformFiles = (bundle.addTransforms ?? []).map((t) => t.file)
      if (addTransformFiles.length === 0) continue

      const paths = codeTransformTargetPaths([id])
      for (const file of addTransformFiles) {
        expect(paths).toContain(file)
      }
    }
  })

  it('does not require a bundle addTransforms target when that bundle is not kept and no other bundle needs it', () => {
    // Documents why the empty-keep-set case looks unchanged: every
    // addTransforms target coincides with SOME bundle's unconditional
    // codeTransforms target, so codeTransformTargetPaths([]) already has it.
    const codeTransformFiles = new Set<string>()
    for (const bundle of Object.values(INTEGRATION_BUNDLES)) {
      for (const transform of bundle.codeTransforms) {
        codeTransformFiles.add(transform.file)
      }
    }
    for (const bundle of Object.values(INTEGRATION_BUNDLES)) {
      for (const transform of bundle.addTransforms ?? []) {
        expect(codeTransformFiles.has(transform.file)).toBe(true)
      }
    }
  })
})

// A raw throw from installBundle's copyBundleFiles/readPayloadFile/
// listPayloadFiles must not abort the re-add batch (bundles after the failing
// one would never re-add after step 6 stripped the live tree);
// setupAddIntegrations catches per bundle, collects the failure, and continues.

describe('M1: setupAddIntegrations collects per-bundle installBundle failures', () => {
  it('a bundle whose payload is missing a declared folder fails without aborting the batch', async () => {
    // Synthetic payload source, NOT built via setupSnapshot, so it can omit a
    // declared path. webgl's payload is incomplete ('lib/webgl' is never
    // created), so copyBundleFiles's listPayloadFiles throws a raw Error.
    // hubspot's is complete and should install cleanly right after.
    const payloadRoot = await mkdtemp(join(tmpdir(), 'satus-m1-payload-'))
    try {
      await Bun.write(
        join(payloadRoot, 'package.json'),
        JSON.stringify({ dependencies: {}, devDependencies: {} })
      )
      await mkdir(join(payloadRoot, 'lib/integrations/hubspot'), {
        recursive: true,
      })
      await Bun.write(
        join(payloadRoot, 'lib/integrations/hubspot/index.ts'),
        'export {}\n'
      )

      const source: PayloadSource = {
        root: payloadRoot,
        label: 'test-payload',
        cleanup: async () => undefined,
      }

      // dryRun: true — this calls the real setupAddIntegrations/installBundle
      // against the REAL project tree's resolvePath (not a sandboxed copy),
      // so dryRun is required to guarantee zero writes.
      const result = await setupAddIntegrations(
        ['webgl', 'hubspot'],
        source,
        true
      )

      // The raw throw was caught and collected: this call resolving, not
      // rejecting, is the point.
      expect(result.failures.length).toBe(1)
      expect(result.failures[0]?.file).toBe('WebGL / 3D')
      expect(result.failures[0]?.error).toContain('lib/webgl')

      // hubspot, re-added AFTER the failing webgl bundle, still succeeded —
      // the batch did not abort on webgl's failure.
      expect(result.failures.some((f) => f.file === 'HubSpot')).toBe(false)
    } finally {
      await rm(payloadRoot, { recursive: true, force: true })
    }
  })
})

// selfPrune's test-file list is glob-derived, not hardcoded.
describe('collectSelfPruneTestFiles (L10 — glob-derived, not hardcoded)', () => {
  it('discovers the real setup-machinery test files on disk', async () => {
    const files = await collectSelfPruneTestFiles()

    expect(files).toContain(
      'lib/scripts/setup-project.preflight-and-prune.test.ts'
    )
    expect(files).toContain('lib/scripts/create-darkroom-contract.test.ts')
    expect(files).toContain('lib/scripts/payload-source.test.ts')
  })

  it('excludes every entry in the KEEP allowlist', async () => {
    const files = await collectSelfPruneTestFiles()

    for (const kept of SELF_PRUNE_KEEP_TEST_FILES) {
      expect(files).not.toContain(kept)
    }
    // Concrete regression check: templates.test.ts ships with every
    // scaffolded project (it tests prepare-handoff's templates) and must
    // survive self-prune.
    expect(files).not.toContain('lib/scripts/templates/templates.test.ts')
  })

  // The glob must not delete tests for commands the scaffold keeps running:
  // `handoff`, the AST engine, and the env-parity guarantee.
  it('keeps the tests for commands that ship', async () => {
    const files = await collectSelfPruneTestFiles()

    for (const kept of [
      'lib/scripts/prepare-handoff.test.ts',
      'lib/scripts/env-drift.test.ts',
      'lib/scripts/ast-transforms.test.ts',
    ]) {
      expect(SELF_PRUNE_KEEP_TEST_FILES.has(kept)).toBe(true)
      expect(files).not.toContain(kept)
    }
  })

  // The allowlist may only name files that exist — a stale entry silently
  // stops protecting anything.
  it('every allowlist entry exists on disk', async () => {
    for (const kept of SELF_PRUNE_KEEP_TEST_FILES) {
      expect(await pathExists(join(projectRoot, kept))).toBe(true)
    }
  })

  // Setup-only tests must still go: they import setup-project.ts (deleted by
  // this same step) or assert on this repo's own integration folders.
  it('still deletes the setup-only tests', async () => {
    const files = await collectSelfPruneTestFiles()

    expect(files).toContain(
      'lib/scripts/setup-project.preflight-and-prune.test.ts'
    )
    expect(files).toContain('lib/scripts/setup-project.test-helpers.ts')
    expect(files).toContain('lib/scripts/create-darkroom-contract.test.ts')
    expect(files).toContain('lib/scripts/payload-source.test.ts')
    expect(files).toContain('lib/scripts/prerender-manifest.test.ts')
  })
})

// Setup's failure gate must see both:
//   (a) a barrel file left re-exporting a deleted module (updateBarrelExports),
//   (b) an EACCES or lock in removeDir/removeFile, which must not read as
//       "path absent" and report a half-stripped tree as clean.

describe('M7: removal and barrel failures reach the failure gate', () => {
  const isRoot = (process.getuid?.() ?? -1) === 0

  /** A scratch directory inside projectRoot — removeDir/removeFile resolve there. */
  const withFixture = async (
    run: (relative: string, absolute: string) => Promise<void>
  ) => {
    const absolute = await mkdtemp(join(projectRoot, '.satus-m7-'))
    const relative = absolute.slice(projectRoot.length + 1)
    try {
      await run(relative, absolute)
    } finally {
      await chmod(absolute, 0o755).catch(() => undefined)
      await rm(absolute, { recursive: true, force: true })
    }
  }

  it('removeFile reports an absent path as "nothing removed", not a failure', async () => {
    expect(await removeFile('does/not/exist.ts')).toBe(false)
  })

  it('removeDir reports an absent path as "nothing removed", not a failure', async () => {
    expect(await removeDir('does/not/exist')).toBe(false)
  })

  it('removeFile deletes a real file and reports true', async () => {
    await withFixture(async (relative, absolute) => {
      await Bun.write(join(absolute, 'doomed.ts'), 'export {}\n')
      expect(await removeFile(`${relative}/doomed.ts`)).toBe(true)
      expect(await pathExists(join(absolute, 'doomed.ts'))).toBe(false)
    })
  })

  it('removeDir deletes a real directory and reports true', async () => {
    await withFixture(async (relative, absolute) => {
      await mkdir(join(absolute, 'doomed'), { recursive: true })
      expect(await removeDir(`${relative}/doomed`)).toBe(true)
      expect(await pathExists(join(absolute, 'doomed'))).toBe(false)
    })
  })

  // A failed removal must never be reported as an absent path, or self-prune
  // runs over a half-stripped tree.
  it.skipIf(isRoot)(
    'removeFile throws when the removal itself fails',
    async () => {
      await withFixture(async (relative, absolute) => {
        await Bun.write(join(absolute, 'locked.ts'), 'export {}\n')
        await chmod(absolute, 0o555) // no write permission on the parent
        await expect(removeFile(`${relative}/locked.ts`)).rejects.toThrow(
          /Failed to remove file/
        )
      })
    }
  )

  it.skipIf(isRoot)(
    'removeDir throws when the removal itself fails',
    async () => {
      await withFixture(async (relative, absolute) => {
        await mkdir(join(absolute, 'locked'), { recursive: true })
        await chmod(absolute, 0o555)
        await expect(removeDir(`${relative}/locked`)).rejects.toThrow(
          /Failed to remove directory/
        )
      })
    }
  )

  it('updateBarrelExports returns a failure instead of only warning', async () => {
    await withFixture(async (relative, absolute) => {
      // A directory where a barrel FILE is expected: the read throws EISDIR,
      // which stands in for any unreadable/unwritable barrel file.
      await mkdir(join(absolute, 'index.ts'), { recursive: true })

      const result = await updateBarrelExports(
        [{ file: `${relative}/index.ts`, pattern: 'use-device-detection' }],
        false
      )

      expect(result.changes).toBe(0)
      expect(result.failures).toHaveLength(1)
      expect(result.failures[0]?.file).toBe(`${relative}/index.ts`)
      expect(result.failures[0]?.error).toContain('barrel export')
    })
  })

  it('updateBarrelExports reports no failure for a barrel it can rewrite', async () => {
    await withFixture(async (relative, absolute) => {
      await Bun.write(
        join(absolute, 'index.ts'),
        "export { useDeviceDetection } from './use-device-detection'\nexport { other } from './other'\n"
      )

      const result = await updateBarrelExports(
        [{ file: `${relative}/index.ts`, pattern: 'use-device-detection' }],
        false
      )

      expect(result.failures).toEqual([])
      expect(result.changes).toBe(1)
      const text = await Bun.file(join(absolute, 'index.ts')).text()
      expect(text).not.toContain('use-device-detection')
      expect(text).toContain('other')
    })
  })
})
