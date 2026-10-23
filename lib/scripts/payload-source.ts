/**
 * A `PayloadSource` is a directory holding a copy of the repo that
 * `installBundle` (`bundle-installer.ts`) copies integration files from;
 * `setup:project` passes its own `setupSnapshot`.
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

/** The payload package.json fields the CLI reads. */
export interface PayloadPackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

export const payloadPathExists = (
  source: PayloadSource,
  relPath: string
): Promise<boolean> => pathExists(join(source.root, relPath))

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

export const readPayloadPackageJson = async (
  source: PayloadSource
): Promise<PayloadPackageJson> => {
  const text = await readPayloadFile(source, 'package.json')
  return JSON.parse(text)
}

/** Recursively list files under a payload directory as sorted root-relative paths. Throws when absent. */
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
