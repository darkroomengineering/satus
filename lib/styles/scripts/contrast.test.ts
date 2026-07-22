/**
 * Contrast gate for the theme palette.
 *
 * WCAG 2.1 is the blocking metric because it is what accessibility law and
 * client contracts actually reference (the DOJ's 2024 ADA rule and EN 301 549
 * both cite WCAG 2.1 AA). APCA is computed alongside it as an advisory signal:
 * it is perceptually better and is W3C's candidate for WCAG 3, but WCAG 3 is
 * still a working draft, so APCA does not fail a build here.
 *
 * The gate ratchets rather than blocks. `KNOWN_DEBT` records the pairs that
 * already fail on `main`; a new failure fails the suite, and fixing a listed
 * pair also fails until its entry is deleted, so the list cannot go stale.
 *
 * Run with: bun test lib/styles/scripts/contrast.test.ts
 */

import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import Color from 'colorjs.io'
import { themes } from '../colors'

/** WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large text and UI components. */
const AA_TEXT = 4.5
const AA_NON_TEXT = 3

/**
 * Pairs that fail today, each `theme/pair` keyed to its measured ratio.
 *
 * All three are red against a tinted surface. The red clears AA against pure
 * black and pure white with only ~0.08 to spare, and `--surface` / `--surface-2`
 * shift the background 4–8% toward the opposite end, which is enough to spend
 * that margin. Fixing them needs a surface-specific accent rather than another
 * lightness tweak, so they are tracked rather than silenced.
 */
const KNOWN_DEBT: Record<string, number> = {
  'light/contrast on surface-2': 3.62,
  'red/secondary on surface': 4.17,
  'red/secondary on surface-2': 3.79,
}

type Role = 'primary' | 'secondary' | 'contrast'

// Read the `color-mix(in oklab, …)` recipes straight out of `global.css` so the
// check recomputes when a percentage is edited instead of drifting from it.
const globalCss = await Bun.file(
  join(import.meta.dir, '..', 'css', 'global.css')
).text()

const MIX =
  /--(?<token>[\w-]+):\s*color-mix\(\s*in oklab,\s*var\(--color-(?<from>\w+)\)\s+(?<pct>\d+)%,\s*(?:var\(--color-(?<onto>\w+)\)|transparent)\s*\)/g

const derived = [...globalCss.matchAll(MIX)].map(({ groups }) => ({
  token: groups?.token as string,
  from: groups?.from as Role,
  pct: Number(groups?.pct) / 100,
  onto: (groups?.onto ?? 'transparent') as Role | 'transparent',
}))

/** Resolve a theme's palette plus every derived token to concrete colours. */
function resolveTheme(theme: Record<Role, string>) {
  const resolved = new Map<string, Color>()
  for (const role of ['primary', 'secondary', 'contrast'] as const) {
    resolved.set(role, new Color(theme[role]))
  }
  for (const { token, from, pct, onto } of derived) {
    // Mixing into `transparent` yields the source colour at `pct` alpha, which
    // only has a contrast value once composited over what sits behind it.
    const backdrop =
      onto === 'transparent' ? new Color(theme.primary) : new Color(theme[onto])
    resolved.set(
      token,
      Color.mix(backdrop, new Color(theme[from]), pct, { space: 'oklab' })
    )
  }
  return resolved
}

/**
 * Token pairs taken from real usage in `components/`, `app/`, and `global.css`,
 * not from every combination the palette allows.
 */
const PAIRS: { label: string; bg: string; fg: Role; min: number }[] = [
  {
    label: 'secondary on primary',
    bg: 'primary',
    fg: 'secondary',
    min: AA_TEXT,
  },
  { label: 'contrast on primary', bg: 'primary', fg: 'contrast', min: AA_TEXT },
  {
    label: 'primary on secondary',
    bg: 'secondary',
    fg: 'primary',
    min: AA_TEXT,
  },
  { label: 'primary on contrast', bg: 'contrast', fg: 'primary', min: AA_TEXT },
  {
    label: 'secondary on surface',
    bg: 'surface',
    fg: 'secondary',
    min: AA_TEXT,
  },
  {
    label: 'secondary on surface-2',
    bg: 'surface-2',
    fg: 'secondary',
    min: AA_TEXT,
  },
  {
    label: 'contrast on surface-2',
    bg: 'surface-2',
    fg: 'contrast',
    min: AA_TEXT,
  },
  {
    label: 'focus ring on primary',
    bg: 'primary',
    fg: 'contrast',
    min: AA_NON_TEXT,
  },
  {
    label: 'border on primary',
    bg: 'primary',
    fg: 'secondary',
    min: AA_NON_TEXT,
  },
]

type Measurement = { key: string; ratio: number; lc: number; min: number }

const measurements: Measurement[] = []
for (const [name, theme] of Object.entries(themes)) {
  const resolved = resolveTheme(theme as Record<Role, string>)
  for (const { label, bg, fg, min } of PAIRS) {
    const background = resolved.get(bg)
    const foreground = resolved.get(fg)
    if (!(background && foreground)) continue
    measurements.push({
      key: `${name}/${label}`,
      ratio: background.contrast(foreground, 'WCAG21'),
      lc: background.contrast(foreground, 'APCA'),
      min,
    })
  }
}

const failing = measurements.filter((m) => m.ratio < m.min)

describe('WCAG 2.1 AA contrast (blocking)', () => {
  it('parses the derived tokens out of global.css', () => {
    expect(derived.map((d) => d.token).sort()).toEqual([
      'line',
      'line-strong',
      'surface',
      'surface-2',
    ])
  })

  it('introduces no contrast failure beyond the tracked baseline', () => {
    const unexpected = failing
      .filter((m) => !(m.key in KNOWN_DEBT))
      .map((m) => `${m.key} = ${m.ratio.toFixed(2)}:1 (needs ${m.min})`)

    expect(unexpected).toEqual([])
  })

  it('keeps the baseline honest — fixed pairs must leave KNOWN_DEBT', () => {
    const failingKeys = new Set(failing.map((m) => m.key))
    const stale = Object.keys(KNOWN_DEBT).filter((key) => !failingKeys.has(key))

    expect(stale).toEqual([])
  })

  it('never regresses a tracked pair further than its recorded ratio', () => {
    const worsened = failing.flatMap((m) => {
      const recorded = KNOWN_DEBT[m.key]
      if (recorded === undefined || m.ratio >= recorded - 0.01) return []
      return [`${m.key} fell to ${m.ratio.toFixed(2)}:1 from ${recorded}`]
    })

    expect(worsened).toEqual([])
  })
})

describe('APCA (advisory)', () => {
  it('reports perceptual contrast for every measured pair', () => {
    // APCA scores text-on-background; |Lc| 60 is roughly the floor for UI and
    // body copy, |Lc| 75 the bar for comfortable primary body text. Reported
    // rather than asserted: WCAG 3 is still a draft, so this is not a gate.
    const weak = measurements
      .filter((m) => m.min === AA_TEXT && Math.abs(m.lc) < 60)
      .map((m) => `${m.key}: Lc ${m.lc.toFixed(1)}`)

    if (weak.length > 0) {
      console.warn(
        `\n  APCA advisory — ${weak.length} pair(s) below Lc 60:\n    ${weak.join('\n    ')}\n`
      )
    }

    expect(measurements.length).toBeGreaterThan(0)
  })
})
