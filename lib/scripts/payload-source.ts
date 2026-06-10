/**
 * Payload source resolution for the `satus add` CLI.
 *
 * The public satus repo IS the registry: an integration's source payload is
 * pulled either from a local checkout (`--from <path>` — the primary path for
 * tests and local development) or from a GitHub tarball at a git ref
 * (`--ref <gitRef>`, the pinned ref recorded in package.json as
 * `"satus": { "ref": … }`, then `main`).
 */

import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathExists, projectRoot } from './utils'

export interface PayloadSourceOptions {
  /** Local satus checkout path (--from). Highest priority. */
  from?: string | undefined
  /** Explicit git ref (--ref). Beats the pinned ref. */
  ref?: string | undefined
  /** Pinned ref recorded in package.json as `"satus": { "ref": … }`. */
  pinnedRef?: string | undefined
}

export interface PayloadSource {
  /** Absolute path to the root of the payload checkout / extraction. */
  root: string
  /** Human-readable origin, for log output. */
  label: string
  /** Remove any temp files created during resolution. No-op for `--from`. */
  cleanup(): Promise<void>
}

/** Shape of the payload package.json fields the CLI reads versions from. */
export interface PayloadPackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

const REPO_TARBALL_BASE =
  'https://codeload.github.com/darkroomengineering/satus/tar.gz/'

/** URL of the GitHub tarball for a satus git ref. */
export const tarballUrl = (ref: string): string => `${REPO_TARBALL_BASE}${ref}`

/** Pick the git ref to fetch: explicit `--ref` > pinned ref > `main`. */
export const pickRef = (
  explicitRef: string | undefined,
  pinnedRef: string | undefined
): { ref: string; origin: 'explicit' | 'pinned' | 'default' } => {
  if (explicitRef) return { ref: explicitRef, origin: 'explicit' }
  if (pinnedRef) return { ref: pinnedRef, origin: 'pinned' }
  return { ref: 'main', origin: 'default' }
}

/** Read the pinned satus ref from a project's package.json, if recorded. */
export const readPinnedRef = async (
  rootDir: string = projectRoot
): Promise<string | undefined> => {
  const pkgFile = Bun.file(join(rootDir, 'package.json'))
  if (!(await pkgFile.exists())) return undefined
  const pkg = (await pkgFile.json()) as { satus?: { ref?: unknown } }
  const ref = pkg.satus?.ref
  return typeof ref === 'string' && ref.length > 0 ? ref : undefined
}

/**
 * Resolve where integration source payloads come from.
 *
 * `--from <localPath>` wins; otherwise the GitHub tarball for the resolved
 * ref is downloaded and extracted into a temp directory via the system `tar`.
 * Callers must `await source.cleanup()` when done.
 */
export const resolvePayloadSource = async (
  options: PayloadSourceOptions
): Promise<PayloadSource> => {
  if (options.from) {
    const root = resolve(options.from)
    if (!(await pathExists(root))) {
      throw new Error(`--from path does not exist: ${root}`)
    }
    if (!(await Bun.file(join(root, 'package.json')).exists())) {
      throw new Error(
        `--from path is not a satus checkout (no package.json): ${root}`
      )
    }
    return {
      root,
      label: `local checkout ${root}`,
      cleanup: async () => {},
    }
  }

  const { ref, origin } = pickRef(options.ref, options.pinnedRef)
  const tempDir = await mkdtemp(join(tmpdir(), 'satus-payload-'))

  try {
    const response = await fetch(tarballUrl(ref))
    if (!response.ok) {
      throw new Error(
        `Failed to download satus@${ref}: HTTP ${response.status} ${response.statusText}`
      )
    }

    const tarPath = join(tempDir, 'satus.tar.gz')
    await Bun.write(tarPath, response)

    const extractRoot = join(tempDir, 'src')
    await mkdir(extractRoot, { recursive: true })

    // System tar (flags shared by BSD and GNU tar); --strip-components drops
    // the tarball's `satus-<ref>/` top-level directory.
    const proc = Bun.spawn(
      ['tar', '-xzf', tarPath, '-C', extractRoot, '--strip-components=1'],
      { stdout: 'ignore', stderr: 'pipe' }
    )
    const exitCode = await proc.exited
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text()
      throw new Error(
        `tar extraction failed (exit ${exitCode}): ${stderr.trim()}`
      )
    }

    return {
      root: extractRoot,
      label: `satus@${ref} (${origin} ref, GitHub tarball)`,
      cleanup: () => rm(tempDir, { recursive: true, force: true }),
    }
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true })
    throw error
  }
}

/** True when `relPath` exists in the payload source (file or directory). */
export const payloadPathExists = (
  source: PayloadSource,
  relPath: string
): Promise<boolean> => pathExists(join(source.root, relPath))

/** Read a payload file as text. Fails loudly when missing. */
export const readPayloadFile = async (
  source: PayloadSource,
  relPath: string
): Promise<string> => {
  const file = Bun.file(join(source.root, relPath))
  if (!(await file.exists())) {
    throw new Error(`Payload source (${source.label}) is missing ${relPath}`)
  }
  return file.text()
}

/** Parsed package.json of the payload source, for dependency version pinning. */
export const readPayloadPackageJson = async (
  source: PayloadSource
): Promise<PayloadPackageJson> => {
  const text = await readPayloadFile(source, 'package.json')
  return JSON.parse(text) as PayloadPackageJson
}

/**
 * Recursively list the files under a payload directory, returned as paths
 * relative to the payload root (e.g. 'lib/integrations/sanity/client.ts'),
 * sorted for deterministic output. Fails loudly when the directory is absent.
 */
export const listPayloadFiles = async (
  source: PayloadSource,
  relDir: string
): Promise<string[]> => {
  if (!(await payloadPathExists(source, relDir))) {
    throw new Error(
      `Payload source (${source.label}) is missing folder ${relDir}`
    )
  }

  const files: string[] = []

  const walk = async (rel: string): Promise<void> => {
    const entries = await readdir(join(source.root, rel), {
      withFileTypes: true,
    })
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
