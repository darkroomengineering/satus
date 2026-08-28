#!/usr/bin/env bun
/**
 * Doctor Script - Diagnose common setup issues
 *
 * Run with: bun run doctor
 */

import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { coreEnvSchema } from '../utils/validation'

const ROOT = process.cwd()

// The single source of the runtime floor is package.json's engines field —
// deriving it here keeps the doctor's check and fix hint from drifting when
// a dependency raises the requirement (the way @portabletext/react v8 moved
// the floor to 22.12).
const packageJson: { engines?: { node?: string } } = await Bun.file(
  join(ROOT, 'package.json')
).json()
const requiredNodeVersion =
  packageJson.engines?.node?.replace(/^[^\d]*/, '') ?? '24.20.0'

interface Check {
  name: string
  check: () => boolean | Promise<boolean> | 'skip'
  fix?: string
  /** Explanation printed when `check` returns `'skip'`. */
  skipReason?: string
}

/**
 * Detect whether cwd is a git repo's main checkout, a linked worktree
 * (`git worktree add`), or not a git repo at all — mirrors the exact
 * detection `prepare.ts` uses to decide whether `lefthook install` is safe
 * to run (linked worktrees share `core.hooksPath` with the main checkout
 * and `lefthook install` refuses to run against that shared path).
 *
 * In a linked worktree, `.git` is a FILE (not a directory) pointing at
 * `<main>/.git/worktrees/<name>`, so a plain `existsSync('.git/hooks/...')`
 * check can never resolve there — it always reports a false failure.
 */
const detectGitLayout = (): 'main' | 'worktree' | 'no-git' => {
  const git = Bun.spawnSync([
    'git',
    'rev-parse',
    '--absolute-git-dir',
    '--git-common-dir',
  ])
  if (git.exitCode !== 0) return 'no-git'
  const [gitDir, commonDir] = git.stdout.toString().trim().split('\n')
  if (gitDir && commonDir && gitDir !== resolve(commonDir)) return 'worktree'
  return 'main'
}

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
}

const checks: Check[] = [
  {
    name: `Node.js version >= ${requiredNodeVersion}`,
    check: () => {
      const [major = 0, minor = 0] = process.versions.node
        .split('.')
        .map((part) => Number.parseInt(part, 10))
      const [requiredMajor = 0, requiredMinor = 0] = requiredNodeVersion
        .split('.')
        .map((part) => Number.parseInt(part, 10))
      return (
        major > requiredMajor ||
        (major === requiredMajor && minor >= requiredMinor)
      )
    },
    fix: `Install Node.js ${requiredNodeVersion}+ from https://nodejs.org or use nvm/fnm`,
  },
  {
    name: 'Bun installed',
    check: () => {
      try {
        return typeof Bun.version === 'string'
      } catch {
        return false
      }
    },
    fix: 'Install Bun: curl -fsSL https://bun.sh/install | bash',
  },
  {
    name: 'Dependencies installed',
    check: () => existsSync(join(ROOT, 'node_modules')),
    fix: 'Run: bun install',
  },
  {
    name: 'Environment file exists',
    check: () =>
      existsSync(join(ROOT, '.env.local')) || existsSync(join(ROOT, '.env')),
    fix: 'Copy .env.example to .env.local and fill in values',
  },
  {
    name: 'Environment variables valid',
    check: () => {
      const result = coreEnvSchema.safeParse(process.env)
      if (!result.success) {
        const issues = result.error.issues.map(
          (i) => `${i.path.join('.')}: ${i.message}`
        )
        console.log(`  ${colors.dim(issues.join(', '))}`)
      }
      return result.success
    },
    fix: 'Check .env.local for invalid values (e.g., NEXT_PUBLIC_BASE_URL must be a valid URL)',
  },
  {
    name: 'TypeScript config exists',
    check: () => existsSync(join(ROOT, 'tsconfig.json')),
    fix: 'Ensure tsconfig.json exists in project root',
  },
  {
    name: 'Next.js config valid',
    check: () =>
      existsSync(join(ROOT, 'next.config.ts')) ||
      existsSync(join(ROOT, 'next.config.js')),
    fix: 'Ensure next.config.ts exists',
  },
  {
    name: 'Oxc config present',
    // The configs are .ts, so `bun run typecheck` already validates their
    // shape. All this needs to check is that they exist under the exact names
    // oxlint/oxfmt auto-discover: `.oxlintrc.ts` and `.oxfmtrc.ts` are silently
    // ignored, and the tools fall back to their defaults without complaining.
    check: () =>
      existsSync(join(ROOT, 'oxlint.config.ts')) &&
      existsSync(join(ROOT, 'oxfmt.config.ts')),
    fix: 'Expected oxlint.config.ts and oxfmt.config.ts in the project root (not .oxlintrc.ts / .oxfmtrc.ts, which are not auto-discovered)',
  },
  {
    name: 'Generated styles exist',
    check: () => existsSync(join(ROOT, 'lib/styles/css/tailwind.css')),
    fix: 'Run: bun run setup:styles',
  },
  {
    name: 'AGENTS.md exists',
    check: () => existsSync(join(ROOT, 'AGENTS.md')),
    fix: 'Create AGENTS.md in project root (canonical engineering standards)',
  },
  {
    name: 'CLAUDE.md exists',
    check: () => existsSync(join(ROOT, 'CLAUDE.md')),
    fix: 'Create CLAUDE.md in project root',
  },
  {
    name: 'COMPONENTS.md exists',
    check: () => existsSync(join(ROOT, 'COMPONENTS.md')),
    fix: 'Create COMPONENTS.md in project root',
  },
  {
    name: 'Font config exists',
    check: () => existsSync(join(ROOT, 'lib/styles/fonts.ts')),
    fix: 'Configure fonts in lib/styles/fonts.ts (next/font/google)',
  },
  {
    name: 'Git hooks installed (lefthook)',
    check: () => {
      const layout = detectGitLayout()
      // Outside a git repo there's nothing to check; in a linked worktree
      // hooks are shared with the main checkout via `core.hooksPath` and
      // `bunx lefthook install` refuses to run against that shared path
      // (same skip prepare.ts already applies) — reporting a fix here would
      // suggest a command that fails.
      if (layout !== 'main') return 'skip'
      return existsSync(join(ROOT, '.git/hooks/pre-commit'))
    },
    fix: 'Run: bunx lefthook install',
    skipReason:
      'not applicable — no git repo, or a linked worktree where hooks are shared with the main checkout',
  },
]

async function runDoctor() {
  console.log('\n🩺 Satus Doctor\n')
  console.log(colors.dim('Checking your development environment...\n'))

  let passed = 0
  let failed = 0
  let skipped = 0

  for (const { name, check, fix, skipReason } of checks) {
    try {
      const result = await check()
      if (result === 'skip') {
        console.log(
          `${colors.dim('−')} ${name} ${colors.dim(`(${skipReason ?? 'not applicable'})`)}`
        )
        skipped++
      } else if (result) {
        console.log(`${colors.green('✓')} ${name}`)
        passed++
      } else {
        console.log(`${colors.red('✗')} ${name}`)
        if (fix) {
          console.log(`  ${colors.dim(`Fix: ${fix}`)}`)
        }
        failed++
      }
    } catch (_error) {
      console.log(
        `${colors.yellow('?')} ${name} ${colors.dim('(check failed)')}`
      )
      failed++
    }
  }

  console.log('')
  const skippedNote = skipped > 0 ? `, ${skipped} skipped` : ''
  if (failed === 0) {
    console.log(
      colors.green(
        `All ${passed} checks passed! Your environment is ready.${skippedNote}`
      )
    )
  } else {
    console.log(
      `${colors.green(`${passed} passed`)}, ${colors.red(`${failed} failed`)}${skippedNote}`
    )
    console.log(
      colors.dim('\nFix the issues above and run again: bun run doctor')
    )
  }
  console.log('')

  process.exit(failed > 0 ? 1 : 0)
}

void runDoctor()
