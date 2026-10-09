#!/usr/bin/env bun
/**
 * env:setup - hand the dotenvx private keys to Vercel, or to a teammate
 *
 * Run with: bun run env:setup [--dry-run]
 *           bun run env:setup --copy
 *
 * Every committed env file is encrypted (README § Environment variables), so
 * Vercel needs the private key of every file a build reads: `.env`
 * (DOTENV_PRIVATE_KEY) and, when it exists, `.env.production`
 * (DOTENV_PRIVATE_KEY_PRODUCTION). `.env.development` is local-only. CI gets
 * no key at all: it builds without the encrypted files (ci.yml), which keeps
 * the key away from dependency code in Dependabot and fork PRs.
 *
 * The key is read into memory and piped to `vercel` on stdin. It is never
 * printed and never passed as an argument: an AI agent running this script
 * sees its output, and arguments show up in process lists. Child output is
 * shown only on failure, with the key redacted. `--copy` puts the lines a
 * teammate needs for `.env.keys` on the clipboard instead, again unprinted.
 */

import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { bunExecutable, copyToClipboard, projectRoot } from './utils'

const flags = new Set(process.argv.slice(2))
const dryRun = flags.has('--dry-run')
const copy = flags.has('--copy')

/** Files a build reads, and the name each file's private key goes by. */
const BUILD_FILES = [
  { file: '.env', keyName: 'DOTENV_PRIVATE_KEY' },
  { file: '.env.production', keyName: 'DOTENV_PRIVATE_KEY_PRODUCTION' },
]

// The package only exports its package.json, so find the CLI next to it.
const dotenvxCli = join(
  dirname(
    createRequire(import.meta.url).resolve('@dotenvx/dotenvx/package.json')
  ),
  'src/cli/dotenvx.js'
)

function fail(message: string): never {
  console.error(`✗ ${message}`)
  process.exit(1)
}

/** Keys whose value in `source` is not encrypted. */
function plainKeys(source: string) {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => ({
      key: line.slice(0, line.indexOf('=')),
      value: line.slice(line.indexOf('=') + 1).replace(/^["']/, ''),
    }))
    .filter(
      ({ key, value }) =>
        !key.startsWith('DOTENV_PUBLIC_KEY') && !value.startsWith('encrypted:')
    )
    .map(({ key }) => key)
}

/** The private key for `file`, or null when this machine doesn't have it. */
function readPrivateKey(file: string, keyName: string) {
  const result = Bun.spawnSync(
    [bunExecutable, dotenvxCli, 'keypair', keyName, '-f', file],
    { cwd: projectRoot, stdout: 'pipe', stderr: 'ignore' }
  )
  const key = result.stdout.toString().trim()
  return /^[0-9a-f]{64}$/.test(key) ? key : null
}

/** What `vercel link` writes to .vercel/project.json. */
interface VercelProjectFile {
  projectName?: string
  projectId?: string
}

/** The linked Vercel project's name (or id), or null when not linked. */
function linkedVercelProject() {
  const path = join(projectRoot, '.vercel', 'project.json')
  if (!existsSync(path)) return null
  const linked: VercelProjectFile = JSON.parse(readFileSync(path, 'utf8'))
  return linked.projectName ?? linked.projectId ?? null
}

const files = BUILD_FILES.filter(({ file }) =>
  existsSync(join(projectRoot, file))
)

if (files.length === 0) {
  fail(
    'No .env yet. Add your first variable with `bun dotenvx set KEY "value"`, ' +
      'which creates an encrypted .env and its key, then run this again.'
  )
}

const keys = files.map(({ file, keyName }) => {
  const plain = plainKeys(readFileSync(join(projectRoot, file), 'utf8'))
  if (plain.length > 0) {
    fail(
      `${file} has plain values (${plain.join(', ')}). ` +
        `Run \`bun dotenvx encrypt -f ${file}\` first.`
    )
  }
  const key = readPrivateKey(file, keyName)
  if (!key) {
    fail(
      `No private key for ${file} on this machine (${keyName}). ` +
        'Put it in .env.keys, or run this where the key was created.'
    )
  }
  return { keyName, key }
})

if (copy) {
  const lines = keys.map(({ keyName, key }) => `${keyName}="${key}"`)
  if (!(await copyToClipboard(`${lines.join('\n')}\n`))) {
    fail('Could not reach the clipboard on this machine.')
  }
  console.log(
    `Copied ${keys.map(({ keyName }) => keyName).join(' and ')} to the clipboard. ` +
      'Send it 1:1 over a private channel, never through an AI chat; the ' +
      'teammate pastes it into .env.keys at the repo root.'
  )
  process.exit(0)
}

const vercel = Bun.which('vercel')
if (!vercel) fail('The `vercel` CLI is not installed.')
const project = linkedVercelProject()
if (!project) fail('This folder is not linked to Vercel. Run `vercel link`.')

console.log(`Vercel project: ${project}`)

let failed = false

for (const { keyName, key } of keys) {
  for (const environment of ['production', 'preview']) {
    if (dryRun) {
      console.log(`- would set ${keyName} for ${environment}`)
      continue
    }
    const result = Bun.spawnSync(
      [
        vercel,
        'env',
        'add',
        keyName,
        environment,
        '--sensitive',
        '--force',
        '--yes',
      ],
      {
        cwd: projectRoot,
        stdin: new TextEncoder().encode(key),
        stdout: 'pipe',
        stderr: 'pipe',
      }
    )
    if (result.exitCode === 0) {
      console.log(`✓ ${keyName} → ${project} (${environment})`)
    } else {
      failed = true
      const output = `${result.stdout}${result.stderr}`
        .replaceAll(key, '[redacted]')
        .trim()
      console.error(`✗ ${keyName} → ${project} (${environment})\n  ${output}`)
    }
  }
}

if (failed) {
  console.error('\nSome keys were not set. Fix the above and run again.')
  process.exit(1)
}

if (!dryRun) {
  console.log(
    '\nDone. To share the keys with a teammate, run `bun run env:setup --copy`: ' +
      'it puts the lines for their .env.keys on your clipboard without showing them.'
  )
}
