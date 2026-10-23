/**
 * Contrast gate for the theme palette. The accepted baseline lives in
 * `contrast-baseline.json`, so a rebranded fork re-records it with
 * `bun run contrast:accept`.
 *
 * The gate ratchets: a pairing below WCAG AA that is not in the baseline fails,
 * and one that improves past its recorded ratio also fails, so the baseline
 * can't go stale. Fix both by re-accepting and reviewing the diff. APCA gets the
 * same ratchet, scoped to text pairs below Lc 60; WCAG stays the absolute
 * floor, APCA only gates changes.
 *
 * Measurement lives in `contrast.ts`, shared with the accept command.
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
const { accepted, apcaAccepted } = await readBaseline()
const failing = measurements.filter((m) => m.ratio < m.min)
const weakApca = measurements.filter(
  (m) => m.min === AA_TEXT && Math.abs(m.lc) < APCA_MIN
)

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

describe('APCA (ratcheted)', () => {
  it('introduces no sub-60 text pair outside the accepted baseline', () => {
    const unexpected = weakApca
      .filter((m) => !(m.key in apcaAccepted))
      .map((m) => `${m.key} = Lc ${m.lc.toFixed(1)} (needs ${APCA_MIN})`)

    if (unexpected.length > 0) {
      console.warn(
        `\n  APCA regression — run \`bun run contrast:accept\` if intentional:\n    ${unexpected.join('\n    ')}\n`
      )
    }

    // Run `bun run contrast:accept` if these are intentional.
    expect(unexpected).toEqual([])
  })

  it('keeps the APCA baseline honest — improved pairs must leave it', () => {
    const weakKeys = new Set(weakApca.map((m) => m.key))
    const stale = Object.keys(apcaAccepted).filter((key) => !weakKeys.has(key))

    if (stale.length > 0) {
      console.warn(
        `\n  APCA baseline stale — run \`bun run contrast:accept\` to drop:\n    ${stale.join('\n    ')}\n`
      )
    }

    // Run `bun run contrast:accept` to drop these.
    expect(stale).toEqual([])
  })

  it('never regresses an accepted APCA pair below its recorded |Lc|', () => {
    const worsened = weakApca.flatMap((m) => {
      const recorded = apcaAccepted[m.key]
      if (recorded === undefined) return []
      const current = Math.abs(m.lc)
      const currentTenths = Math.round(current * 10)
      const recordedTenths = Math.round(recorded * 10)
      if (currentTenths >= recordedTenths) return []
      return [`${m.key} fell to Lc ${current.toFixed(1)} from ${recorded}`]
    })

    if (worsened.length > 0) {
      console.warn(`\n  APCA worsened:\n    ${worsened.join('\n    ')}\n`)
    }

    expect(worsened).toEqual([])
  })
})
