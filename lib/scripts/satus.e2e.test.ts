/**
 * Round-trip e2e for `setup:project` (subtract) → `satus add` (restore).
 *
 * Run with: bun test lib/scripts/satus.e2e.test.ts
 *
 * Builds a real throwaway project on disk from this repo's source files, runs
 * the actual CLIs against it via Bun.spawn (cwd = temp project, so the
 * cwd-based project root in lib/scripts/utils.ts targets the temp tree), and
 * asserts the add restores what the subtract removed. Entirely network-free:
 * the payload source is `--from <this repo>`, package resolution reuses the
 * repo's node_modules via a symlink, and both CLIs run with --skip-install.
 *
 * Pilots:
 * - shopify — payload folder + next.config.ts remotePattern + env stubs
 * - webgl   — richest shared-file wiring (features barrel, Wrapper overwrite,
 *             next.config.ts) plus the theatre interplay: theatre stays
 *             absent, so the Theatre.js wiring shipped inside the freshly
 *             copied fluid/flowmap hooks must be stripped again
 */

import { afterAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { cp, mkdtemp, readdir, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { applyOpsToText } from './ast-transforms'
import { INTEGRATION_BUNDLES } from './integration-bundles'
import { pathExists } from './utils'

const REPO_ROOT = join(import.meta.dir, '..', '..')

// Each test spawns one or two CLI processes (ts-morph boot included).
setDefaultTimeout(120_000)

// ---------------------------------------------------------------------------
// Temp-project helper
// ---------------------------------------------------------------------------

const COPY_DIRS = ['app', 'components', 'lib', 'public']
const COPY_FILES = [
  'package.json',
  'next.config.ts',
  'tsconfig.json',
  'biome.json',
  'bunfig.toml',
  '.env.example',
]

/**
 * Copy this repo's source files into a fresh mkdtemp directory and symlink the
 * repo's node_modules into it (so spawned scripts resolve @clack/prompts and
 * ts-morph without any install). Never copies node_modules/.git/.next/.claude
 * — only the explicit source lists above.
 */
const createTempProject = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'satus-e2e-'))

  for (const dir of COPY_DIRS) {
    if (await pathExists(join(REPO_ROOT, dir))) {
      await cp(join(REPO_ROOT, dir), join(root, dir), { recursive: true })
    }
  }
  for (const file of COPY_FILES) {
    if (await Bun.file(join(REPO_ROOT, file)).exists()) {
      await cp(join(REPO_ROOT, file), join(root, file))
    }
  }

  await symlink(join(REPO_ROOT, 'node_modules'), join(root, 'node_modules'))
  return root
}

// ---------------------------------------------------------------------------
// CLI runners
// ---------------------------------------------------------------------------

interface RunResult {
  exitCode: number
  stdout: string
  stderr: string
}

/** Run a repo script with the temp project as cwd (non-TTY, so no prompts). */
const runScript = async (
  cwd: string,
  scriptRelPath: string,
  args: string[]
): Promise<RunResult> => {
  const proc = Bun.spawn([process.execPath, scriptRelPath, ...args], {
    cwd,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1' },
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { exitCode, stdout, stderr }
}

/** Subtract: keep only `keep`, removing the rest — no prompts, no install. */
const runSetup = (cwd: string, keep: string): Promise<RunResult> =>
  runScript(cwd, 'lib/scripts/setup-project.ts', [
    '--keep',
    keep,
    '--yes',
    '--skip-install',
  ])

/** Restore: add `plugin` back from this repo as the local payload source. */
const runAdd = (cwd: string, plugin: string): Promise<RunResult> =>
  runScript(cwd, 'lib/scripts/satus.ts', [
    'add',
    plugin,
    '--from',
    REPO_ROOT,
    '--yes',
    '--skip-install',
  ])

/** Fail loudly with the CLI output when a spawned script exits non-zero. */
const expectClean = (result: RunResult, label: string): void => {
  if (result.exitCode !== 0) {
    throw new Error(
      `${label} failed (exit ${result.exitCode})\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
    )
  }
}

// ---------------------------------------------------------------------------
// File assertions
// ---------------------------------------------------------------------------

const readRepoFile = (rel: string): Promise<string> =>
  Bun.file(join(REPO_ROOT, rel)).text()

const readProjectFile = (root: string, rel: string): Promise<string> =>
  Bun.file(join(root, rel)).text()

interface PackageJsonDeps {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const readPackageJson = (root: string): Promise<PackageJsonDeps> =>
  Bun.file(join(root, 'package.json')).json() as Promise<PackageJsonDeps>

/** Recursively list files under `root/relDir`, repo-relative, sorted. */
const listFiles = async (root: string, relDir: string): Promise<string[]> => {
  const files: string[] = []
  const walk = async (rel: string): Promise<void> => {
    const entries = await readdir(join(root, rel), { withFileTypes: true })
    for (const entry of entries) {
      const childRel = `${rel}/${entry.name}`
      if (entry.isDirectory()) {
        await walk(childRel)
      } else {
        files.push(childRel)
      }
    }
  }
  await walk(relDir)
  return files.sort()
}

/**
 * Assert every file of a source-repo folder exists in the temp project with
 * identical content. `expectedOverrides` swaps the expected text for files
 * that legitimately differ from the repo (e.g. theatre-stripped webgl hooks).
 */
const expectFolderMatchesSource = async (
  projectRoot: string,
  folder: string,
  expectedOverrides: Record<string, string> = {}
): Promise<void> => {
  const sourceFiles = await listFiles(REPO_ROOT, folder)
  expect(sourceFiles.length).toBeGreaterThan(0)

  for (const rel of sourceFiles) {
    const local = Bun.file(join(projectRoot, rel))
    expect(await local.exists(), `${rel} should exist after add`).toBe(true)
    const expected = expectedOverrides[rel] ?? (await readRepoFile(rel))
    expect(await local.text(), `${rel} should match the payload source`).toBe(
      expected
    )
  }
}

/** Assert every bundle dependency is pinned to the payload repo's version. */
const expectDepsMatchPayload = (
  localDeps: Record<string, string> | undefined,
  payloadDeps: Record<string, string> | undefined,
  names: string[]
): void => {
  for (const dep of names) {
    const version = payloadDeps?.[dep]
    expect(version, `payload package.json should declare ${dep}`).toBeTruthy()
    expect(localDeps?.[dep], `${dep} should be pinned after add`).toBe(
      version as string
    )
  }
}

/** Files snapshotted after the first add to prove the second add is a no-op. */
const IDEMPOTENCY_FILES = [
  'package.json',
  'next.config.ts',
  'lib/features/index.tsx',
]

const snapshotFiles = async (root: string): Promise<Record<string, string>> => {
  const snapshot: Record<string, string> = {}
  for (const rel of IDEMPOTENCY_FILES) {
    snapshot[rel] = await readProjectFile(root, rel)
  }
  return snapshot
}

const expectSnapshotUnchanged = async (
  root: string,
  snapshot: Record<string, string>
): Promise<void> => {
  for (const rel of IDEMPOTENCY_FILES) {
    const after = await readProjectFile(root, rel)
    expect(after, `${rel} should be unchanged by a repeated add`).toBe(
      snapshot[rel] as string
    )
  }
}

// ---------------------------------------------------------------------------
// Pilot 1: shopify — payload folder + remotePatterns + env stubs + deps
// ---------------------------------------------------------------------------

describe('round trip: shopify', () => {
  const shopify = INTEGRATION_BUNDLES.shopify
  if (!shopify) throw new Error('shopify bundle not found')

  let project = ''
  let snapshot: Record<string, string> = {}

  afterAll(async () => {
    if (project) await rm(project, { recursive: true, force: true })
  })

  it('subtract then add restores the bundle from the payload', async () => {
    project = await createTempProject()

    expectClean(
      await runSetup(project, 'sanity,hubspot,mailchimp,webgl,theatre'),
      'setup:project (subtract shopify)'
    )

    expect(await pathExists(join(project, 'lib/integrations/shopify'))).toBe(
      false
    )
    expect(await readProjectFile(project, 'next.config.ts')).not.toContain(
      'cdn.shopify.com'
    )

    expectClean(await runAdd(project, 'shopify'), 'satus add shopify')

    // The whole payload folder is back, byte-identical to the source repo
    await expectFolderMatchesSource(project, 'lib/integrations/shopify')

    // next.config.ts regains the remotePatterns entry
    expect(await readProjectFile(project, 'next.config.ts')).toContain(
      'cdn.shopify.com'
    )

    // Every env var is present in .env.example (appended as `# VAR=` stubs)
    const envExample = await readProjectFile(project, '.env.example')
    for (const envVar of shopify.envVars) {
      expect(envExample, `.env.example should carry ${envVar}`).toMatch(
        new RegExp(`^#?\\s*${envVar}=`, 'm')
      )
    }

    // package.json carries every bundle dependency at the payload's pin
    // (vacuous today — shopify declares none — but guards future additions)
    const pkg = await readPackageJson(project)
    const repoPkg = await readPackageJson(REPO_ROOT)
    expectDepsMatchPayload(
      pkg.dependencies,
      repoPkg.dependencies,
      shopify.dependencies
    )

    snapshot = await snapshotFiles(project)
  })

  it('a second add is byte-stable on the shared files', async () => {
    if (!project) throw new Error('first shopify round-trip test must run')

    expectClean(await runAdd(project, 'shopify'), 'satus add shopify (rerun)')
    await expectSnapshotUnchanged(project, snapshot)
  })
})

// ---------------------------------------------------------------------------
// Pilot 2: webgl — shared-file wiring + theatre interplay (theatre stays out)
// ---------------------------------------------------------------------------

describe('round trip: webgl without theatre', () => {
  const webgl = INTEGRATION_BUNDLES.webgl
  const theatre = INTEGRATION_BUNDLES.theatre
  if (!(webgl && theatre)) throw new Error('webgl/theatre bundles not found')

  let project = ''
  let snapshot: Record<string, string> = {}

  afterAll(async () => {
    if (project) await rm(project, { recursive: true, force: true })
  })

  it('add webgl after subtract: wiring restored, leak stripped', async () => {
    project = await createTempProject()

    expectClean(
      await runSetup(project, 'sanity,shopify,hubspot,mailchimp'),
      'setup:project (subtract webgl + theatre)'
    )

    expect(await pathExists(join(project, 'lib/webgl'))).toBe(false)
    expect(await pathExists(join(project, 'lib/dev/theatre'))).toBe(false)
    expect(
      await readProjectFile(project, 'lib/features/index.tsx')
    ).not.toContain('LazyGlobalCanvas')

    expectClean(await runAdd(project, 'webgl'), 'satus add webgl')

    // Theatre was not requested and must stay absent
    expect(await pathExists(join(project, 'lib/dev/theatre'))).toBe(false)

    // The payload ships the fluid/flowmap hooks WITH Theatre wiring; with
    // theatre absent, the add must strip it again — the expected text is the
    // payload content with theatre's removal ops applied.
    const expectedOverrides: Record<string, string> = {}
    for (const rel of [
      'lib/webgl/utils/fluid/index.tsx',
      'lib/webgl/utils/flowmaps/index.tsx',
    ]) {
      const ops = theatre.codeTransforms.find((t) => t.file === rel)?.ops ?? []
      expectedOverrides[rel] = applyOpsToText(await readRepoFile(rel), ops)
    }
    await expectFolderMatchesSource(project, 'lib/webgl', expectedOverrides)

    const fluid = await readProjectFile(
      project,
      'lib/webgl/utils/fluid/index.tsx'
    )
    expect(fluid).not.toContain('@theatre/core')
    expect(fluid).not.toContain('useTheatre')

    // Integration-owned Wrapper is restored wholesale from the payload
    expect(
      await readProjectFile(project, 'components/layout/wrapper/index.tsx')
    ).toBe(await readRepoFile('components/layout/wrapper/index.tsx'))

    // lib/features/index.tsx regains the LazyGlobalCanvas const + JSX
    const features = await readProjectFile(project, 'lib/features/index.tsx')
    expect(features).toContain('const LazyGlobalCanvas = dynamic(')
    expect(features).toContain('<LazyGlobalCanvas />')

    // next.config.ts regains the optimizePackageImports entries
    const nextConfig = await readProjectFile(project, 'next.config.ts')
    expect(nextConfig).toContain("'@react-three/drei'")
    expect(nextConfig).toContain("'@react-three/fiber'")
    expect(nextConfig).toContain("'three'")

    // package.json regains every webgl dependency at the payload's pin
    const pkg = await readPackageJson(project)
    const repoPkg = await readPackageJson(REPO_ROOT)
    expectDepsMatchPayload(
      pkg.dependencies,
      repoPkg.dependencies,
      webgl.dependencies
    )
    expectDepsMatchPayload(
      pkg.devDependencies,
      repoPkg.devDependencies,
      webgl.devDependencies
    )

    snapshot = await snapshotFiles(project)
  })

  it('a second add is byte-stable on the shared files', async () => {
    if (!project) throw new Error('first webgl round-trip test must run')

    expectClean(await runAdd(project, 'webgl'), 'satus add webgl (rerun)')
    await expectSnapshotUnchanged(project, snapshot)
  })
})
