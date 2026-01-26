#!/usr/bin/env bun
/**
 * Doctor Script - Diagnose common setup issues
 *
 * Run with: bun run doctor
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

interface Check {
  name: string
  check: () => boolean | Promise<boolean>
  fix?: string
}

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
}

const checks: Check[] = [
  {
    name: 'Node.js version >= 22',
    check: () => {
      const version = process.versions.node
      const major = Number.parseInt(version.split('.')[0] ?? '0', 10)
      return major >= 22
    },
    fix: 'Install Node.js 22+ from https://nodejs.org or use nvm/fnm',
  },
  {
    name: 'Bun installed',
    check: () => {
      try {
        Bun.version
        return true
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
    name: 'Biome config valid',
    check: () => {
      try {
        const biome = readFileSync(join(ROOT, 'biome.json'), 'utf-8')
        JSON.parse(biome)
        return true
      } catch {
        return false
      }
    },
    fix: 'Check biome.json for syntax errors',
  },
  {
    name: 'Generated styles exist',
    check: () => existsSync(join(ROOT, 'lib/styles/css/tailwind.css')),
    fix: 'Run: bun run setup:styles',
  },
  {
    name: 'Public fonts directory exists',
    check: () => existsSync(join(ROOT, 'public/fonts')),
    fix: 'Add fonts to public/fonts/ directory',
  },
  {
    name: 'Git hooks installed (lefthook)',
    check: () => existsSync(join(ROOT, '.git/hooks/pre-commit')),
    fix: 'Run: bunx lefthook install',
  },
]

async function runDoctor() {
  console.log('\n🩺 Satus Doctor\n')
  console.log(colors.dim('Checking your development environment...\n'))

  let passed = 0
  let failed = 0

  for (const { name, check, fix } of checks) {
    try {
      const result = await check()
      if (result) {
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
  if (failed === 0) {
    console.log(
      colors.green(`All ${passed} checks passed! Your environment is ready.`)
    )
  } else {
    console.log(
      `${colors.green(`${passed} passed`)}, ${colors.red(`${failed} failed`)}`
    )
    console.log(
      colors.dim('\nFix the issues above and run again: bun run doctor')
    )
  }
  console.log('')

  process.exit(failed > 0 ? 1 : 0)
}

runDoctor()
