/**
 * Record the current contrast failures as the accepted baseline.
 *
 * Run this after deliberately changing the palette — most often right after
 * rebranding a fork of this starter, when the shipped baseline no longer
 * describes your colours:
 *
 *   bun run contrast:accept
 *
 * It prints everything it is about to accept. Read that list: each line is a
 * colour pairing that does not meet WCAG AA, and accepting it is a decision to
 * ship it. The resulting `contrast-baseline.json` is meant to be reviewed in a
 * pull request like any other change.
 */

import { BASELINE_PATH, measureContrast, readBaseline } from './contrast'

const measurements = await measureContrast()
const failing = measurements.filter((m) => m.ratio < m.min)
const previous = await readBaseline()

const accepted: Record<string, number> = {}
for (const m of failing.sort((a, b) => a.key.localeCompare(b.key))) {
  accepted[m.key] = Number(m.ratio.toFixed(2))
}

const added = Object.keys(accepted).filter((k) => !(k in previous.accepted))
const removed = Object.keys(previous.accepted).filter((k) => !(k in accepted))

await Bun.write(BASELINE_PATH, `${JSON.stringify({ accepted }, null, 2)}\n`)

if (failing.length === 0) {
  console.log('✓ Every measured pair meets WCAG AA. Baseline is empty.')
} else {
  console.log(
    `Accepting ${failing.length} pair(s) below WCAG AA — each one ships as-is:\n`
  )
  for (const [key, ratio] of Object.entries(accepted)) {
    const needs = failing.find((m) => m.key === key)?.min
    console.log(`  ${key}  ${ratio}:1 (needs ${needs})`)
  }
}

if (added.length > 0) console.log(`\n  newly accepted: ${added.join(', ')}`)
if (removed.length > 0)
  console.log(`  no longer failing: ${removed.join(', ')}`)

console.log(
  `\nWrote ${BASELINE_PATH.split('/').slice(-1)[0]}. Review it before committing.`
)
