/**
 * Bundle installation primitives and shared sequences.
 *
 * Extracted from `satus.ts` so that both `satus.ts` and `setup-project.ts`
 * can import from a neutral module rather than `setup-project.ts` depending
 * on the CLI executable `satus.ts`.
 */

import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import * as p from '@clack/prompts'
import { applyCodeTransforms, applyOpsToText } from './ast-transforms'
import { findBarrelLine, insertBarrelLine } from './barrel-file'
import {
  type CodeTransform,
  getIntegrationEntries,
  type IntegrationBundle,
} from './integration-bundles'
import {
  listPayloadFiles,
  type PayloadPackageJson,
  type PayloadSource,
  payloadPathExists,
  readPayloadFile,
} from './payload-source'
import { pathExists, resolvePath } from './utils'

// ---------------------------------------------------------------------------
// Install steps (moved from satus.ts)
// ---------------------------------------------------------------------------

/** A bundle counts as installed when its first folder (or file) exists. */
export function bundleProbePath(bundle: IntegrationBundle): string | undefined {
  return bundle.folders[0] ?? bundle.files[0]
}

export const isInstalled = async (
  bundle: IntegrationBundle
): Promise<boolean> => {
  const probe = bundleProbePath(bundle)
  if (!probe) return false
  return pathExists(resolvePath(probe))
}

/**
 * Copy the bundle's `folders` and `files` from the payload source into the
 * project. Existing files are kept (unless --force); missing ones are always
 * copied. Fails loudly when the payload lacks a declared folder or file.
 */
export const copyBundleFiles = async (
  source: PayloadSource,
  bundle: IntegrationBundle,
  options: { dryRun: boolean; force: boolean }
): Promise<{ copied: number; skipped: number }> => {
  const relFiles: string[] = []

  for (const folder of bundle.folders) {
    relFiles.push(...(await listPayloadFiles(source, folder)))
  }
  for (const file of bundle.files) {
    if (!(await payloadPathExists(source, file))) {
      throw new Error(`Payload source (${source.label}) is missing ${file}`)
    }
    relFiles.push(file)
  }

  let copied = 0
  let skipped = 0

  for (const rel of relFiles) {
    const dest = resolvePath(rel)
    if ((await pathExists(dest)) && !options.force) {
      skipped++
      continue
    }
    if (!options.dryRun) {
      await mkdir(dirname(dest), { recursive: true })
      await Bun.write(dest, Bun.file(join(source.root, rel)))
    }
    copied++
  }

  return { copied, skipped }
}

/**
 * Copy the bundle's integration-owned `overwriteFiles` wholesale from the
 * payload source. A local file is only overwritten when it matches either
 * the payload version (already wired — no-op) or the expected lean state
 * (the payload version with this bundle's removal codeTransforms applied).
 * Anything else means local modifications — skip with a warning unless
 * --force.
 */
export const applyOverwriteFiles = async (
  source: PayloadSource,
  bundle: IntegrationBundle,
  options: { dryRun: boolean; force: boolean }
): Promise<{ written: string[]; skipped: string[] }> => {
  const written: string[] = []
  const skipped: string[] = []

  for (const rel of bundle.overwriteFiles ?? []) {
    const payloadText = await readPayloadFile(source, rel)
    const dest = resolvePath(rel)

    if (!(await pathExists(dest))) {
      if (!options.dryRun) {
        await mkdir(dirname(dest), { recursive: true })
        await Bun.write(dest, payloadText)
      }
      written.push(rel)
      continue
    }

    const localText = await Bun.file(dest).text()
    if (localText === payloadText) continue // already wired

    const removalOps =
      bundle.codeTransforms.find((t) => t.file === rel)?.ops ?? []
    const expectedLean = applyOpsToText(payloadText, removalOps)

    if (localText === expectedLean || options.force) {
      if (!options.dryRun) {
        await Bun.write(dest, payloadText)
      }
      written.push(rel)
    } else {
      skipped.push(rel)
    }
  }

  return { written, skipped }
}

const sortRecord = (record: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b))
  )

/**
 * Add the bundle's dependencies to the local package.json, pinning each to
 * the version declared by the payload source's package.json. Dependencies
 * already present locally keep their existing pin.
 */
export const addDependencies = async (
  bundle: IntegrationBundle,
  payloadPkg: PayloadPackageJson,
  options: { dryRun: boolean }
): Promise<{ added: string[]; missing: string[] }> => {
  const pkgPath = resolvePath('package.json')
  const pkg = (await Bun.file(pkgPath).json()) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    [key: string]: unknown
  }

  const added: string[] = []
  const missing: string[] = []

  const addFrom = (
    names: string[],
    target: 'dependencies' | 'devDependencies'
  ): void => {
    for (const name of names) {
      const version =
        payloadPkg.dependencies?.[name] ?? payloadPkg.devDependencies?.[name]
      if (!version) {
        missing.push(name)
        continue
      }
      const record = pkg[target] ?? {}
      pkg[target] = record
      if (record[name]) continue // already present — keep the local pin
      record[name] = version
      added.push(`${name}@${version}`)
    }
  }

  addFrom(bundle.dependencies, 'dependencies')
  addFrom(bundle.devDependencies, 'devDependencies')

  if (added.length > 0 && !options.dryRun) {
    if (pkg.dependencies) pkg.dependencies = sortRecord(pkg.dependencies)
    if (pkg.devDependencies) {
      pkg.devDependencies = sortRecord(pkg.devDependencies)
    }
    await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  }

  return { added, missing }
}

/**
 * Restore the bundle's barrel export lines: read each pattern's line from the
 * SOURCE repo's barrel file and insert it into the local barrel when absent
 * (created when missing). Warns when the payload has no matching barrel/line.
 */
export const restoreBarrelExports = async (
  source: PayloadSource,
  bundle: IntegrationBundle,
  options: { dryRun: boolean }
): Promise<number> => {
  let changes = 0

  for (const { file, pattern } of bundle.barrelExports) {
    if (!(await payloadPathExists(source, file))) {
      p.log.warn(
        `Payload source has no barrel file ${file} — skipping export restore for "${pattern}"`
      )
      continue
    }

    const sourceText = await readPayloadFile(source, file)
    const line = findBarrelLine(sourceText, pattern)
    if (!line) {
      p.log.warn(
        `No export line matching "${pattern}" in payload ${file} — skipping`
      )
      continue
    }

    const localPath = resolvePath(file)
    const localText = (await pathExists(localPath))
      ? await Bun.file(localPath).text()
      : ''
    const updated = insertBarrelLine(localText, line)

    if (updated !== localText) {
      if (!options.dryRun) {
        await mkdir(dirname(localPath), { recursive: true })
        await Bun.write(localPath, updated)
      }
      changes++
    }
  }

  return changes
}

/** Append missing env vars as commented stubs to .env.example (created when absent). */
export const appendEnvStubs = async (
  envVars: string[],
  dryRun: boolean
): Promise<number> => {
  if (envVars.length === 0) return 0

  const envPath = resolvePath('.env.example')
  const exists = await pathExists(envPath)
  const content = exists ? await Bun.file(envPath).text() : ''

  const missing = envVars.filter(
    (envVar) => !new RegExp(`^#?\\s*${envVar}=`, 'm').test(content)
  )
  if (missing.length === 0) return 0

  if (!dryRun) {
    const base =
      content.length === 0 || content.endsWith('\n') ? content : `${content}\n`
    const stubs = missing.map((envVar) => `# ${envVar}=`).join('\n')
    await Bun.write(envPath, `${base}${stubs}\n`)
  }

  return missing.length
}

// ---------------------------------------------------------------------------
// Shared install sequence
// ---------------------------------------------------------------------------

/**
 * Run the shared per-bundle install sequence: copy files, restore overwrite
 * files, add dependencies, restore barrel exports, append env stubs, apply
 * additive code transforms.
 *
 * Returns a `details` string array (one entry per action taken) that callers
 * can use for logging. Does not manage spinners or log directly.
 */
export const installBundle = async (
  source: PayloadSource,
  bundle: IntegrationBundle,
  payloadPkg: PayloadPackageJson,
  options: { dryRun: boolean; force: boolean }
): Promise<{
  details: string[]
  depsAdded: string[]
  overwriteSkipped: string[]
  depsMissing: string[]
}> => {
  const details: string[] = []

  const { copied, skipped } = await copyBundleFiles(source, bundle, options)
  if (copied > 0) details.push(`${copied} files copied`)
  if (skipped > 0) details.push(`${skipped} existing files kept`)

  const overwrite = await applyOverwriteFiles(source, bundle, options)
  if (overwrite.written.length > 0) {
    details.push(`${overwrite.written.length} integration-owned files restored`)
  }

  const deps = await addDependencies(bundle, payloadPkg, options)
  if (deps.added.length > 0) {
    details.push(`${deps.added.length} dependencies pinned`)
  }

  const barrelChanges = await restoreBarrelExports(source, bundle, options)
  if (barrelChanges > 0) {
    details.push(`${barrelChanges} barrel exports restored`)
  }

  const envChanges = await appendEnvStubs(bundle.envVars, options.dryRun)
  if (envChanges > 0) details.push(`${envChanges} env stubs appended`)

  const transformChanges = await applyCodeTransforms(
    bundle.addTransforms ?? [],
    options.dryRun
  )
  if (transformChanges > 0) {
    details.push(`${transformChanges} files re-wired`)
  }

  return {
    details,
    depsAdded: deps.added,
    overwriteSkipped: overwrite.skipped,
    depsMissing: deps.missing,
  }
}

// ---------------------------------------------------------------------------
// Shared strip block (de-duplicated from satus.ts and setup-project.ts)
// ---------------------------------------------------------------------------

/**
 * Strip absent-integration wiring from freshly copied files.
 *
 * For every integration NOT in `installedOrAdded` AND not currently installed
 * on disk, apply its subtractive `codeTransforms`. These ops are no-ops on
 * files already in the lean state, so calling this after an install is safe.
 *
 * @param installedOrAdded - Set (or array) of integration ids that are being
 *   added / were already added in this run and should NOT be stripped.
 * @param dryRun - When true, count changes but do not write files.
 * @returns The number of files that were actually changed.
 */
export const stripAbsentIntegrationWiring = async (
  installedOrAdded: Set<string> | string[],
  dryRun: boolean
): Promise<number> => {
  const skipSet =
    installedOrAdded instanceof Set
      ? installedOrAdded
      : new Set(installedOrAdded)

  const stripTransforms: CodeTransform[] = []
  for (const [id, bundle] of getIntegrationEntries()) {
    if (skipSet.has(id)) continue
    if (await isInstalled(bundle)) continue
    stripTransforms.push(...bundle.codeTransforms)
  }

  if (stripTransforms.length === 0) return 0
  return applyCodeTransforms(stripTransforms, dryRun)
}
