#!/usr/bin/env bun
/**
 * Docs Check Script - Validate documentation freshness
 *
 * Run with: bun run docs:check
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
}

let passed = 0
let failed = 0

function pass(message: string) {
  console.log(`${colors.green('\u2713')} ${message}`)
  passed++
}

function fail(message: string, fix?: string) {
  console.log(`${colors.red('\u2717')} ${message}`)
  if (fix) {
    console.log(`  ${colors.dim(`Fix: ${fix}`)}`)
  }
  failed++
}

/** List subdirectories that contain an index.tsx */
function listComponentDirs(dir: string): string[] {
  const abs = join(ROOT, dir)
  if (!existsSync(abs)) return []
  const entries: string[] = []
  for (const name of readdirSync(abs)) {
    const full = join(abs, name)
    if (statSync(full).isDirectory() && existsSync(join(full, 'index.tsx'))) {
      entries.push(name)
    }
  }
  return entries.sort()
}

/** List files matching a pattern in a directory */
function listFiles(dir: string, ext: string, exclude: string[]): string[] {
  const abs = join(ROOT, dir)
  if (!existsSync(abs)) return []
  return readdirSync(abs)
    .filter((f) => {
      if (!f.endsWith(ext)) return false
      for (const ex of exclude) {
        if (f.endsWith(ex)) return false
      }
      return true
    })
    .sort()
}

/** List effect component files (*.tsx) */
function listEffectFiles(): string[] {
  const abs = join(ROOT, 'components/effects')
  if (!existsSync(abs)) return []
  return readdirSync(abs)
    .filter((f) => f.endsWith('.tsx'))
    .sort()
}

/** Check that a file has at least one export statement */
function hasExport(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8')
    return /\bexport\b/.test(content)
  } catch {
    return false
  }
}

/** Convert a file basename to import-path segment (strip extension) */
function fileToSegment(file: string): string {
  return file.replace(/\.(tsx?|js)$/, '')
}

function run() {
  console.log('\n\uD83D\uDCCB Satus Docs Check\n')
  console.log(colors.dim('Checking documentation freshness...\n'))

  // ── 1. Check doc files exist and are non-empty ────────────────────────

  const docs: Array<{ name: string; path: string }> = [
    { name: 'COMPONENTS.md', path: join(ROOT, 'COMPONENTS.md') },
    { name: 'CLAUDE.md', path: join(ROOT, 'CLAUDE.md') },
    { name: 'PATTERNS.md', path: join(ROOT, 'PATTERNS.md') },
  ]

  let componentsContent = ''

  for (const doc of docs) {
    if (!existsSync(doc.path)) {
      fail(`${doc.name} missing`, `Create ${doc.name} in project root`)
      continue
    }
    const content = readFileSync(doc.path, 'utf-8').trim()
    if (content.length === 0) {
      fail(`${doc.name} is empty`, `Add content to ${doc.name}`)
      continue
    }
    if (doc.name === 'COMPONENTS.md') {
      componentsContent = content
    }
    pass(`${doc.name} exists`)
  }

  // If COMPONENTS.md is missing or empty, skip completeness checks
  if (!componentsContent) {
    console.log(
      `\n${colors.yellow('!')} Skipping completeness checks (COMPONENTS.md not available)\n`
    )
    printSummary()
    return
  }

  // ── 2. COMPONENTS.md completeness ─────────────────────────────────────

  // UI components
  const uiDirs = listComponentDirs('components/ui')
  const missingUi = uiDirs.filter(
    (name) => !componentsContent.includes(`@/components/ui/${name}`)
  )
  if (missingUi.length === 0) {
    pass(`All ${uiDirs.length} UI components listed in COMPONENTS.md`)
  } else {
    for (const name of missingUi) {
      fail(
        `Missing from COMPONENTS.md: @/components/ui/${name}`,
        'Add entry to COMPONENTS.md'
      )
    }
  }

  // Layout components
  const layoutDirs = listComponentDirs('components/layout')
  const missingLayout = layoutDirs.filter(
    (name) => !componentsContent.includes(`@/components/layout/${name}`)
  )
  if (missingLayout.length === 0) {
    pass(`All ${layoutDirs.length} layout components listed in COMPONENTS.md`)
  } else {
    for (const name of missingLayout) {
      fail(
        `Missing from COMPONENTS.md: @/components/layout/${name}`,
        'Add entry to COMPONENTS.md'
      )
    }
  }

  // Effect components
  const effectFiles = listEffectFiles()
  const missingEffects = effectFiles.filter((f) => {
    const segment = fileToSegment(f)
    return !componentsContent.includes(`@/components/effects/${segment}`)
  })
  if (missingEffects.length === 0) {
    pass(`All ${effectFiles.length} effect components listed in COMPONENTS.md`)
  } else {
    for (const f of missingEffects) {
      const segment = fileToSegment(f)
      fail(
        `Missing from COMPONENTS.md: @/components/effects/${segment}`,
        'Add entry to COMPONENTS.md'
      )
    }
  }

  // Hooks (lib/hooks/*.ts excluding .test.ts, .d.ts, index.ts)
  const hookFiles = listFiles('lib/hooks', '.ts', [
    '.test.ts',
    '.d.ts',
    'index.ts',
  ])
  const missingHooks = hookFiles.filter((f) => {
    const segment = fileToSegment(f)
    return !componentsContent.includes(`@/hooks/${segment}`)
  })
  if (missingHooks.length === 0) {
    pass(`All ${hookFiles.length} hooks listed in COMPONENTS.md`)
  } else {
    for (const f of missingHooks) {
      const segment = fileToSegment(f)
      fail(
        `Missing from COMPONENTS.md: @/hooks/${segment}`,
        'Add entry to COMPONENTS.md'
      )
    }
  }

  // Utilities (lib/utils/*.ts excluding .test.ts, .d.ts)
  const utilFiles = listFiles('lib/utils', '.ts', ['.test.ts', '.d.ts'])
  const missingUtils = utilFiles.filter((f) => {
    const segment = fileToSegment(f)
    return !componentsContent.includes(`@/utils/${segment}`)
  })
  if (missingUtils.length === 0) {
    pass(`All ${utilFiles.length} utility modules listed in COMPONENTS.md`)
  } else {
    for (const f of missingUtils) {
      const segment = fileToSegment(f)
      fail(
        `Missing from COMPONENTS.md: @/utils/${segment}`,
        'Add entry to COMPONENTS.md'
      )
    }
  }

  // ── 3. Export consistency ─────────────────────────────────────────────

  const noExport: string[] = []
  for (const name of uiDirs) {
    const filePath = join(ROOT, 'components/ui', name, 'index.tsx')
    if (!hasExport(filePath)) {
      noExport.push(`@/components/ui/${name}`)
    }
  }
  if (noExport.length === 0) {
    pass('All UI component index files have exports')
  } else {
    for (const path of noExport) {
      fail(
        `No exports found in ${path}/index.tsx`,
        'Add at least one export statement'
      )
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────

  console.log('')
  printSummary()
}

function printSummary() {
  if (failed === 0) {
    console.log(
      colors.green(`All ${passed} checks passed! Documentation is up to date.`)
    )
  } else {
    console.log(
      `${colors.green(`${passed} passed`)}, ${colors.red(`${failed} failed`)}`
    )
    console.log(
      colors.dim('\nFix the issues above and run again: bun run docs:check')
    )
  }
  console.log('')

  process.exit(failed > 0 ? 1 : 0)
}

run()
