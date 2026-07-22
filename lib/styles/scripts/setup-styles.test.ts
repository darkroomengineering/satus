/**
 * Guards the generated stylesheets against drift.
 *
 * `lib/styles/css/tailwind.css` and `root.css` are produced from the palette in
 * `colors.ts` and the rest of `lib/styles/config.ts`. Editing a color without
 * re-running `setup:styles` leaves the CSS stale, and nothing else in the
 * pipeline notices: the app keeps compiling and every theme keeps rendering the
 * previous palette. These tests rebuild in memory and compare against what is
 * committed, so the drift fails here instead of shipping.
 *
 * On failure: run `bun run setup:styles` and commit the regenerated files.
 *
 * Run with: bun test lib/styles/scripts/setup-styles.test.ts
 */

import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { Glob } from 'bun'
import { colors, themes } from '../config'
import { buildStyleSheets, OUTPUTS } from './setup-styles'

const DECLARATION = /^\s*(?<property>[a-z-]+)\s*:\s*(?<value>[^;]+);/gim

const COLOR_PROPERTY =
  /^(color|background|background-color|border|border-[a-z]+|border-[a-z]+-color|outline|outline-color|fill|stroke|box-shadow|text-shadow|text-decoration-color|caret-color|accent-color|column-rule-color)$/

/** CSS named colours. `transparent` and `currentColor` are deliberately absent. */
const NAMED_COLOR =
  /\b(aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen)\b/i

const repoRoot = join(import.meta.dir, '..', '..', '..')
const built = buildStyleSheets()

const readCommitted = (path: string) => Bun.file(join(repoRoot, path)).text()

describe('generated stylesheets', () => {
  it('tailwind.css matches a fresh build of the current config', async () => {
    expect(await readCommitted(OUTPUTS.tailwind)).toBe(built.tailwind)
  })

  it('root.css matches a fresh build of the current config', async () => {
    expect(await readCommitted(OUTPUTS.root)).toBe(built.root)
  })

  it('emits every palette entry and theme as a custom property', () => {
    for (const name of Object.keys(colors)) {
      expect(built.tailwind).toContain(`--color-${name}:`)
    }

    for (const [name, theme] of Object.entries(themes)) {
      expect(built.tailwind).toContain(`[data-theme=${name}]`)

      for (const value of Object.values(theme)) {
        expect(built.tailwind).toContain(value)
      }
    }
  })
})

describe('color authoring rules', () => {
  // AGENTS.md: colors are always oklch, mixing is always oklab. Hex and rgb()
  // survive round-tripping through the generator unnoticed, so the palette is
  // checked at its source rather than in the generated output.
  it('authors every palette value in oklch', () => {
    for (const [name, value] of Object.entries(colors)) {
      expect(`${name}: ${value}`).toMatch(/: oklch\(/)
    }
  })

  it('never emits hex, rgb, or hsl colors', () => {
    for (const css of [built.tailwind, built.root]) {
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      expect(css).not.toMatch(/\b(rgba?|hsla?)\(/i)
    }
  })

  // The checks above only see generated output. Hand-written modules are where
  // a stray `background: pink` actually lands, so scan those too — including
  // CSS named colours, which read as intentional and survive a hex/rgb grep.
  it('authors every colour in hand-written CSS as oklch', async () => {
    const offenders: string[] = []

    for await (const path of new Glob('{app,components,lib}/**/*.css').scan(
      repoRoot
    )) {
      const css = await Bun.file(join(repoRoot, path)).text()

      for (const { groups } of css.matchAll(DECLARATION)) {
        const property = groups?.property
        const rawValue = groups?.value
        if (!(property && rawValue && COLOR_PROPERTY.test(property))) continue

        // `var()` and `url()` payloads are references, not authored colours.
        const value = rawValue
          .replace(/var\([^)]*\)/g, '')
          .replace(/url\([^)]*\)/g, '')

        if (
          NAMED_COLOR.test(value) ||
          /#[0-9a-f]{3,8}\b/i.test(value) ||
          /\b(rgba?|hsla?)\(/i.test(value)
        ) {
          offenders.push(`${path}: ${property}: ${rawValue.trim()}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
