/**
 * Payload source readers shared by `setup:project`'s additive re-add step
 * (`installBundle` in `bundle-installer.ts`).
 *
 * A `PayloadSource` is a directory on disk holding a full copy of the repo
 * (or the subset a caller captured) that integration files are copied from.
 * `setup:project` builds its own local snapshot (`setupSnapshot` in
 * `setup-project.ts`) as the payload source for re-adding kept integrations.
 */

import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathExists } from './utils'

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
