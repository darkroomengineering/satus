#!/usr/bin/env bun
/**
 * env:setup - hand the dotenvx private keys to GitHub and Vercel
 *
 * Run with: bun run env:setup [--skip-github] [--skip-vercel] [--dry-run]
 *
 * Every committed env file is encrypted (README § Environment variables), so
 * CI and Vercel each need the private key of every file a build reads: `.env`
 * (DOTENV_PRIVATE_KEY) and, when it exists, `.env.production`
 * (DOTENV_PRIVATE_KEY_PRODUCTION). `.env.development` is local-only.
 *
 * The key is read into memory and piped to `gh` and `vercel` on stdin. It is
 * never printed and never passed as an argument: an AI agent running this
 * script sees its output, and arguments show up in process lists. Child
 * output is shown only on failure, with the key redacted. The person running
 * it shares the key with the team themselves (see the closing message).
 */

import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { bunExecutable, projectRoot } from './utils'

const flags = new Set(process.argv.slice(2))
const skipGithub = flags.has('--skip-github')
const skipVercel = flags.has('--skip-vercel')
const dryRun = flags.has('--dry-run')

/** Files a build reads, and the secret name each file's private key goes by. */
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

/** The private key for `file`, or null when this machine doesn't have it. */
function readPrivateKey(file: string, keyName: string) {
  const result = Bun.spawnSync(
    [bunExecutable, dotenvxCli, 'keypair', keyName, '-f', file],
    { cwd: projectRoot, stdout: 'pipe', stderr: 'ignore' }
  )
  const key = result.stdout.toString().trim()
  return /^[0-9a-f]{64}$/.test(key) ? key : null
}

interface Target {
  label: string
  command: string[]
}

function targetsFor(keyName: string) {
  const targets: Target[] = []
  const skipped: string[] = []

  if (!skipGithub) {
    const gh = Bun.which('gh')
    if (gh) {
      targets.push(
        { label: 'GitHub Actions', command: [gh, 'secret', 'set', keyName] },
        {
          label: 'GitHub Dependabot',
          command: [gh, 'secret', 'set', keyName, '--app', 'dependabot'],
        }
      )
    } else {
      skipped.push('GitHub: `gh` is not installed (https://cli.github.com)')
    }
  }

  if (!skipVercel) {
    const vercel = Bun.which('vercel')
    if (!vercel) {
      skipped.push('Vercel: the `vercel` CLI is not installed')
    } else if (!existsSync(join(projectRoot, '.vercel', 'project.json'))) {
      skipped.push('Vercel: this folder is not linked, run `vercel link`')
    } else {
      for (const environment of ['production', 'preview']) {
        targets.push({
          label: `Vercel ${environment}`,
          command: [
            vercel,
            'env',
            'add',
            keyName,
            environment,
            '--sensitive',
            '--force',
            '--yes',
          ],
        })
      }
    }
  }

  return { targets, skipped }
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

let failed = false
const allSkipped = new Set<string>()

for (const { file, keyName } of files) {
  const source = readFileSync(join(projectRoot, file), 'utf8')
  if (!source.includes('DOTENV_PUBLIC_KEY')) {
    fail(
      `${file} is not encrypted. Run \`bun dotenvx encrypt -f ${file}\` first.`
    )
  }

  const key = readPrivateKey(file, keyName)
  if (!key) {
    fail(
      `No private key for ${file} on this machine (${keyName}). ` +
        'Put it in .env.keys, or run this where the key was created.'
    )
  }

  const { targets, skipped } = targetsFor(keyName)
  for (const reason of skipped) allSkipped.add(reason)

  for (const { label, command } of targets) {
    if (dryRun) {
      console.log(`- would set ${keyName} in ${label}`)
      continue
    }
    const result = Bun.spawnSync(command, {
      cwd: projectRoot,
      stdin: new TextEncoder().encode(key),
      stdout: 'pipe',
      stderr: 'pipe',
    })
    if (result.exitCode === 0) {
      console.log(`✓ ${keyName} → ${label}`)
    } else {
      failed = true
      const output = `${result.stdout}${result.stderr}`
        .replaceAll(key, '[redacted]')
        .trim()
      console.error(`✗ ${keyName} → ${label}\n  ${output}`)
    }
  }
}

for (const reason of allSkipped) console.error(`✗ not set: ${reason}`)

if (failed || allSkipped.size > 0) {
  console.error(
    '\nSome destinations were not set. Fix the above and run again, or pass ' +
      '--skip-github / --skip-vercel to leave one out on purpose.'
  )
  process.exit(1)
}

if (!dryRun) {
  console.log(
    '\nDone. Share the key with your team yourself, over a private channel ' +
      '(not an AI chat). Copy it with `bun dotenvx keypair DOTENV_PRIVATE_KEY`, ' +
      'piped to `pbcopy` on macOS or `Set-Clipboard` on Windows. ' +
      'Teammates put the line DOTENV_PRIVATE_KEY="..." in .env.keys.'
  )
}
