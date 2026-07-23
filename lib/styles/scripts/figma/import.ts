/**
 * Figma → repo token importer.
 *
 * Reads `figma-tokens.json` (produced by the Figma export step — see README.md),
 * converts colors to `oklch()`, and regenerates the source config the style
 * pipeline consumes:
 *
 *   figma-tokens.json ──▶ colors.ts + layout.mjs ──▶ bun setup:styles ──▶ CSS
 *
 * Figma is the source of truth for the palette, themes, and grid; `breakpoints`
 * (a code-side media-query value, not a Figma variable) is preserved from the
 * existing layout.mjs. The contrast gate (`bun run check`) validates every sync.
 *
 * Run: bun run figma:import
 */

import { join } from 'node:path'
import Color from 'colorjs.io'
import { type FigmaTokens, figmaTokensSchema } from './schema'

const HERE = import.meta.dir
const STYLES = join(HERE, '..', '..') // lib/styles
const TOKENS_PATH = join(HERE, 'figma-tokens.json')
const COLORS_PATH = join(STYLES, 'colors.ts')
const LAYOUT_PATH = join(STYLES, 'layout.mjs')
const TYPO_FIGMA_PATH = join(STYLES, 'typography.figma.ts')
const MOTION_PATH = join(STYLES, 'motion.ts')
const TYPO_SHELL_PATH = join(STYLES, 'typography.ts')

const banner = (extra = '') => `/*
 * GENERATED FROM FIGMA VARIABLES — DO NOT EDIT DIRECTLY.
 * Source of truth: Figma variables → figma-tokens.json → bun run figma:import.${extra}
 */`

/** Trim trailing zeros: 0.5920 → "0.592", 0 → "0", 1 → "1". */
const num = (n: number, digits: number) => String(Number(n.toFixed(digits)))

function toOklch({ r, g, b }: { r: number; g: number; b: number }): string {
  const [L, C, H] = new Color('srgb', [r, g, b]).to('oklch').coords
  const hue = H == null || Number.isNaN(H) ? 0 : H
  return `oklch(${num(L ?? 0, 4)} ${num(C ?? 0, 4)} ${num(hue, 2)})`
}

/** Wrap a description into `//` comment lines at ~72 chars, indented by `indent`. */
function commentLines(text: string, indent: string): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (line && `${line} ${word}`.length > 72) {
      lines.push(`${indent}// ${line}`)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(`${indent}// ${line}`)
  return lines
}

const ident = (key: string) =>
  /^[A-Za-z_$][\w$]*$/.test(key) ? key : `'${key}'`

function generateColors(tokens: FigmaTokens): string {
  const { primitives, themes } = tokens
  const themeNames = Object.keys(themes)
  const colorNames = Object.keys(themes[themeNames[0] as string] as object)

  const paletteLines: string[] = []
  for (const [name, value] of Object.entries(primitives)) {
    if (value.description)
      paletteLines.push(...commentLines(value.description, '  '))
    paletteLines.push(`  ${ident(name)}: '${toOklch(value)}',`)
  }

  const themeLines: string[] = []
  for (const theme of themeNames) {
    themeLines.push(`  ${ident(theme)}: {`)
    for (const role of colorNames) {
      const entry = (
        themes[theme] as Record<
          string,
          { ref?: string; rgb?: { r: number; g: number; b: number } }
        >
      )[role]
      const rhs = entry?.ref
        ? `colors.${entry.ref}`
        : `'${toOklch(entry?.rgb as { r: number; g: number; b: number })}'`
      themeLines.push(`    ${ident(role)}: ${rhs},`)
    }
    themeLines.push('  },')
  }

  return `${banner()}

const colors = {
${paletteLines.join('\n')}
} as const

const themeNames = [${themeNames.map((n) => `'${n}'`).join(', ')}] as const
const colorNames = [${colorNames.map((n) => `'${n}'`).join(', ')}] as const

const themes = {
${themeLines.join('\n')}
} as const satisfies Themes

export { colors, themeNames, themes }

// UTIL TYPES
export type Themes = Record<
  (typeof themeNames)[number],
  Record<(typeof colorNames)[number], string>
>
`
}

function responsiveBlock(name: string, entries: FigmaTokens['layout']): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(entries)) {
    if (value.description) lines.push(...commentLines(value.description, '  '))
    lines.push(
      `  ${ident(key)}: { mobile: ${value.mobile}, desktop: ${value.desktop} },`
    )
  }
  return `const ${name} = {\n${lines.join('\n')}\n}`
}

async function readBreakpoints(): Promise<Record<string, number>> {
  try {
    const mod = (await import(`${LAYOUT_PATH}?t=${Date.now()}`)) as {
      breakpoints?: Record<string, number>
    }
    if (mod.breakpoints) return mod.breakpoints
  } catch {
    // fall through to default
  }
  return { dt: 800 }
}

function generateLayout(
  tokens: FigmaTokens,
  breakpoints: Record<string, number>
): string {
  const bpLines = Object.entries(breakpoints).map(
    ([k, v]) => `  ${ident(k)}: ${v},`
  )
  const screenLines = Object.entries(tokens.screens).map(
    ([k, v]) => `  ${ident(k)}: { width: ${v.width}, height: ${v.height} },`
  )

  return `// THIS FILE HAS TO STAY .mjs AS ITS CONSUMED BY POSTCSS
${banner(' `breakpoints` below is code-owned and preserved across syncs.')}
const breakpoints = {
${bpLines.join('\n')}
}

const screens = {
${screenLines.join('\n')}
}

${responsiveBlock('layout', tokens.layout)}

${responsiveBlock('customSizes', tokens.customSizes)}

export { breakpoints, customSizes, layout, screens }
`
}

function generateTypographyFigma(tokens: FigmaTokens): string {
  const lines: string[] = []
  for (const [style, t] of Object.entries(tokens.typography)) {
    lines.push(`  ${ident(style)}: {`)
    lines.push(`    family: '${t.family}',`)
    lines.push(`    weight: ${t.weight},`)
    lines.push(`    fontStyle: '${t.fontStyle}',`)
    lines.push(`    letterSpacing: '${t.letterSpacing}',`)
    lines.push(`    leadingTrim: '${t.leadingTrim}',`)
    lines.push(
      `    fontFeatureSettings: ${t.fontFeatureSettings == null ? 'null' : `'${t.fontFeatureSettings}'`},`
    )
    lines.push(
      `    fontSize: { mobile: ${t.fontSize.mobile}, desktop: ${t.fontSize.desktop} },`
    )
    lines.push(
      `    lineHeight: { mobile: '${t.lineHeight.mobile}', desktop: '${t.lineHeight.desktop}' },`
    )
    lines.push('  },')
  }
  return `${banner(' Overrides live in typography.ts.')}

export const figmaTypography = {
${lines.join('\n')}
} as const
`
}

function generateMotion(tokens: FigmaTokens): string {
  const lines = Object.entries(tokens.motion).map(
    ([name, ms]) => `  ${ident(name)}: ${ms},`
  )
  return `${banner()}

/** Motion durations in ms. Emitted to root.css as \`--<name>: <ms>ms\`. */
export const durations = {
${lines.join('\n')}
} as const
`
}

/**
 * Warn (never fail) when a code override in typography.ts masks a live Figma
 * value — so a design change that silently does nothing is visible.
 */
async function reportTypographyDrift(tokens: FigmaTokens): Promise<void> {
  let overrides: Record<string, Record<string, unknown>> = {}
  try {
    const mod = (await import(`${TYPO_SHELL_PATH}?t=${Date.now()}`)) as {
      overrides?: Record<string, Record<string, unknown>>
    }
    overrides = mod.overrides ?? {}
  } catch {
    return
  }
  const drift: string[] = []
  for (const [style, props] of Object.entries(overrides)) {
    const figmaStyle = (
      tokens.typography as Record<string, Record<string, unknown>>
    )[style]
    if (!figmaStyle) continue
    for (const [prop, overrideVal] of Object.entries(props)) {
      const figmaVal = figmaStyle[prop]
      if (JSON.stringify(figmaVal) !== JSON.stringify(overrideVal)) {
        drift.push(
          `    ${style}.${prop}: figma=${JSON.stringify(figmaVal)} → override=${JSON.stringify(overrideVal)}`
        )
      }
    }
  }
  if (drift.length) {
    console.warn(
      `\n⚠ ${drift.length} code override(s) mask Figma values (intentional, but review):\n${drift.join('\n')}`
    )
  }
}

async function run() {
  const raw = await Bun.file(TOKENS_PATH).json()
  const tokens = figmaTokensSchema.parse(raw)

  const breakpoints = await readBreakpoints()
  await Bun.write(COLORS_PATH, generateColors(tokens))
  await Bun.write(LAYOUT_PATH, generateLayout(tokens, breakpoints))
  await Bun.write(TYPO_FIGMA_PATH, generateTypographyFigma(tokens))
  await Bun.write(MOTION_PATH, generateMotion(tokens))

  // Normalize formatting to house style, then regenerate the CSS.
  await Bun.spawn(
    [
      'bun',
      'biome',
      'format',
      '--write',
      COLORS_PATH,
      LAYOUT_PATH,
      TYPO_FIGMA_PATH,
      MOTION_PATH,
    ],
    {
      cwd: join(STYLES, '..', '..'),
      stdout: 'inherit',
      stderr: 'inherit',
    }
  ).exited

  const setup = Bun.spawn(['bun', 'run', 'setup:styles'], {
    cwd: join(STYLES, '..', '..'),
    stdout: 'inherit',
    stderr: 'inherit',
  })
  await setup.exited

  await reportTypographyDrift(tokens)

  console.log(
    `\n✓ Imported ${Object.keys(tokens.primitives).length} palette colors, ${Object.keys(tokens.themes).length} themes, ${Object.keys(tokens.layout).length + Object.keys(tokens.customSizes).length} layout tokens, ${Object.keys(tokens.typography).length} type styles, ${Object.keys(tokens.motion).length} durations from Figma.`
  )
  console.log(
    '  Next: bun run check   (validates contrast + types before commit)'
  )
}

run()
