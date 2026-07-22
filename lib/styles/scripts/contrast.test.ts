/**
 * Contrast gate for the theme palette.
 *
 * The accepted baseline lives in `contrast-baseline.json`, not in this file, so
 * a fork that rebrands can re-record it in one step instead of hand-editing a
 * list that describes someone else's colours:
 *
 *   bun run contrast:accept
 *
 * The gate ratchets. A pairing that drops below WCAG AA and is not in the
 * baseline fails; a pairing that improves past its recorded ratio also fails,
 * so the baseline cannot quietly go stale. Both are fixed by re-accepting and
 * reviewing the diff.
 *
 * Measurement itself lives in `contrast.ts`, shared with the accept command.
 *
 * Run with: bun test lib/styles/scripts/contrast.test.ts
 */

import { describe, expect, it } from 'bun:test'
import {
  AA_TEXT,
  APCA_MIN,
  measureContrast,
  readBaseline,
  readDerivedTokens,
} from './contrast'

const measurements = await measureContrast()
const { accepted } = await readBaseline()
const failing = measurements.filter((m) => m.ratio < m.min)

describe('WCAG 2.1 AA contrast (blocking)', () => {
  it('measures every theme against every used token pair', () => {
    expect(measurements.length).toBeGreaterThan(0)
    expect(new Set(measurements.map((m) => m.key)).size).toBe(
      measurements.length
    )
  })

  it('parses the derived tokens out of global.css', async () => {
    const derived = await readDerivedTokens()
    expect(derived.map((d) => d.token).sort()).toEqual([
      'line',
      'line-strong',
      'surface',
      'surface-2',
    ])
  })

  it('introduces no contrast failure outside the accepted baseline', () => {
    const unexpected = failing
      .filter((m) => !(m.key in accepted))
      .map((m) => `${m.key} = ${m.ratio.toFixed(2)}:1 (needs ${m.min})`)

    // Run `bun run contrast:accept` if these are intentional.
    expect(unexpected).toEqual([])
  })

  it('keeps the baseline honest — improved pairs must leave it', () => {
    const failingKeys = new Set(failing.map((m) => m.key))
    const stale = Object.keys(accepted).filter((key) => !failingKeys.has(key))

    // Run `bun run contrast:accept` to drop these.
    expect(stale).toEqual([])
  })

  it('never regresses an accepted pair below its recorded ratio', () => {
    const worsened = failing.flatMap((m) => {
      const recorded = accepted[m.key]
      if (recorded === undefined || m.ratio >= recorded - 0.01) return []
      return [`${m.key} fell to ${m.ratio.toFixed(2)}:1 from ${recorded}`]
    })

    expect(worsened).toEqual([])
  })
})

describe('APCA (advisory)', () => {
  it('reports perceptual contrast for every measured pair', () => {
    const weak = measurements
      .filter((m) => m.min === AA_TEXT && Math.abs(m.lc) < APCA_MIN)
      .map((m) => `${m.key}: Lc ${m.lc.toFixed(1)}`)

    if (weak.length > 0) {
      console.warn(
        `\n  APCA advisory — ${weak.length} pair(s) below Lc ${APCA_MIN}:\n    ${weak.join('\n    ')}\n`
      )
    }

    expect(measurements.length).toBeGreaterThan(0)
  })
})
