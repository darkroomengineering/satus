/**
 * Fails when lint disables or `@ts-*` suppressions per rule differ from
 * `lint-disables.json`, so every change to the count shows up in review, or
 * when one has no `-- <reason>`.
 */

import { parseSync } from 'oxc-parser'

const BASELINE_PATH = 'lint-disables.json'
const SOURCE_PATTERN = /\.(?:[cm]?[jt]sx?)$/
// Same forms oxlint honors: block or line, eslint- or oxlint- prefixed.
const DIRECTIVE_PATTERN =
  /^(?:oxlint|eslint)-disable(?:-next-line|-line)?(?=\s|$)(.*)$/s
// A directive naming no rule turns off every rule.
const ALL_RULES = '*'
// Counted under their own names, e.g. `@ts-ignore`.
const TS_DIRECTIVE_PATTERN =
  /^\**\s*(@ts-(?:ignore|expect-error|nocheck))\b(.*)$/s

interface Site {
  rule: string
  location: string
}

function lineOf(source: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset; i++) {
    if (source.charCodeAt(i) === 10) line++
  }
  return line
}

interface Directive {
  rules: string[]
  reason: string
}

function reasonOf(rest: string): string {
  const separator = rest.indexOf('--')
  return separator === -1 ? '' : rest.slice(separator + 2).trim()
}

function parseDirective(comment: string): Directive | undefined {
  const tsMatch = TS_DIRECTIVE_PATTERN.exec(comment.trim())
  if (tsMatch?.[1]) {
    return { rules: [tsMatch[1]], reason: reasonOf(tsMatch[2] ?? '') }
  }
  const match = DIRECTIVE_PATTERN.exec(comment.trim())
  if (!match) return undefined
  const rest = match[1] ?? ''
  const [list = ''] = rest.split('--')
  const rules = list.split(/[\s,]+/).filter(Boolean)
  return {
    rules: rules.length > 0 ? rules : [ALL_RULES],
    reason: reasonOf(rest),
  }
}

function sourceFiles(): string[] {
  // Includes untracked files.
  const result = Bun.spawnSync([
    'git',
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
  ])
  if (!result.success) {
    console.error('check:disables: `git ls-files` failed — is this a git repo?')
    process.exit(1)
  }
  return result.stdout
    .toString()
    .split('\n')
    .filter((path) => SOURCE_PATTERN.test(path))
}

async function main(): Promise<void> {
  const sites: Site[] = []
  const unexplained: string[] = []
  for (const path of sourceFiles()) {
    const file = Bun.file(path)
    if (!(await file.exists())) continue
    const source = await file.text()
    for (const comment of parseSync(path, source).comments) {
      const directive = parseDirective(comment.value)
      if (!directive) continue
      const location = `${path}:${lineOf(source, comment.start)}`
      for (const rule of directive.rules) sites.push({ rule, location })
      if (!directive.reason) unexplained.push(`    ${location}`)
    }
  }

  const counts = new Map<string, number>()
  for (const { rule } of sites) counts.set(rule, (counts.get(rule) ?? 0) + 1)

  const baseline = new Map<string, number>(
    Object.entries(await Bun.file(BASELINE_PATH).json())
  )
  const rules = [...new Set([...counts.keys(), ...baseline.keys()])].sort()

  const offenses: string[] = []
  for (const rule of rules) {
    const count = counts.get(rule) ?? 0
    const allowed = baseline.get(rule) ?? 0
    if (count > allowed) {
      offenses.push(`  ${rule}: ${count} disables, ${allowed} allowed`)
      for (const site of sites) {
        if (site.rule === rule) offenses.push(`    ${site.location}`)
      }
    } else if (count < allowed) {
      offenses.push(
        `  ${rule}: ${count} disables, ${allowed} allowed — lower it to ${count}`
      )
    }
  }

  if (unexplained.length > 0) {
    offenses.push('  disables without a `-- <reason>`:', ...unexplained)
  }

  if (offenses.length > 0) {
    console.error(
      `check:disables: disables do not match ${BASELINE_PATH} or lack a reason\n`
    )
    for (const offense of offenses) console.error(offense)
    console.error(
      `\nFix the code instead of disabling the rule. If a disable is truly needed, end it with \`-- <why the rule is wrong here>\` and change its number in ${BASELINE_PATH}; the reviewer approves the bump.`
    )
    process.exit(1)
  }

  console.log(
    `check:disables: ${sites.length} disables, all within ${BASELINE_PATH}`
  )
}

if (import.meta.main) {
  await main()
}
