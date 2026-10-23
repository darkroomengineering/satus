/**
 * Contrast measurement shared by `contrast.test.ts` (asserts) and
 * `contrast-accept.ts` (records the baseline), so they can't measure differently.
 *
 * WCAG 2.1 blocks: the DOJ 2024 ADA rule and EN 301 549 cite WCAG 2.1 AA, so it
 * is the floor no baseline waives. APCA (W3C's candidate for WCAG 3, still a
 * draft) is a second signal that gates changes against the accepted baseline:
 * new or worsened sub-60 pairs fail.
 */

import { join } from 'node:path'

import Color from 'colorjs.io'

import { themes } from '../colors'

/** WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large text and UI components. */
export const AA_TEXT = 4.5
export const AA_NON_TEXT = 3

/** APCA floor for UI and body copy. Ratcheted against the accepted baseline. */
export const APCA_MIN = 60

export type Role = 'primary' | 'secondary' | 'contrast'

export type Measurement = {
  key: string
  ratio: number
  lc: number
  min: number
}

/**
 * Token pairs taken from real usage in `components/`, `app/`, and `global.css`,
 * rather than every combination the palette allows.
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

const MIX =
  /--(?<token>[\w-]+):\s*color-mix\(\s*in oklab,\s*var\(--color-(?<from>\w+)\)\s+(?<pct>\d+)%,\s*(?:var\(--color-(?<onto>\w+)\)|transparent)\s*\)/g

/** Reads the `color-mix(in oklab, …)` recipes from `global.css`, so edited percentages are re-measured. */
export async function readDerivedTokens() {
  const css = await Bun.file(
    join(import.meta.dir, '..', 'css', 'global.css')
  ).text()

  // SAFETY: `token`, `from`, `pct` are unconditional groups in MIX, so any
  // match has them set; `onto` is optional (the `transparent` alternative
  // doesn't capture it), hence its fallback below.
  return [...css.matchAll(MIX)].map(({ groups }) => ({
    token: groups?.token as string,
    from: groups?.from as Role,
    pct: Number(groups?.pct) / 100,
    onto: (groups?.onto ?? 'transparent') as Role | 'transparent',
  }))
}

export async function measureContrast(): Promise<Measurement[]> {
  const derived = await readDerivedTokens()
  const measurements: Measurement[] = []

  for (const [name, theme] of Object.entries(themes)) {
    const t: Record<Role, string> = theme
    const resolved = new Map<string, Color>()

    for (const role of ['primary', 'secondary', 'contrast'] as const) {
      resolved.set(role, new Color(t[role]))
    }

    for (const { token, from, pct, onto } of derived) {
      // Mixing into `transparent` yields the source colour at `pct` alpha, which
      // only has a contrast value once composited over what sits behind it.
      const backdrop = new Color(onto === 'transparent' ? t.primary : t[onto])
      resolved.set(
        token,
        Color.mix(backdrop, new Color(t[from]), pct, { space: 'oklab' })
      )
    }

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

  return measurements
}

export const BASELINE_PATH = join(import.meta.dir, 'contrast-baseline.json')

export type Baseline = {
  /** Failing pairs, keyed to the ratio recorded when the baseline was taken. */
  accepted: Record<string, number>
  /** Sub-Lc-60 text pairs, keyed to the |Lc| recorded when the baseline was taken. */
  apcaAccepted: Record<string, number>
}

export async function readBaseline(): Promise<Baseline> {
  const file = Bun.file(BASELINE_PATH)
  if (!(await file.exists())) return { accepted: {}, apcaAccepted: {} }
  const baseline: Partial<Baseline> = await file.json()
  return {
    accepted: baseline.accepted ?? {},
    apcaAccepted: baseline.apcaAccepted ?? {},
  }
}
