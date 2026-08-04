/**
 * Guards the three-tier cascade contract: CSS Module > Tailwind utility >
 * browser reset.
 *
 * `@import 'tailwindcss/utilities.css'` alone (no full `@import
 * 'tailwindcss'`, no `layer()` modifier) compiles every utility — Tailwind's
 * built-ins and the custom `@utility` rules in `tailwind.css` — as bare,
 * unlayered CSS, at the same cascade tier as `reset.css`'s unlayered
 * `all: unset` rule and any unlayered CSS Module. Whoever loads last (or has
 * the higher specificity) wins, which is unpredictable across chunks.
 *
 * The fix needs TWO layers, in a specific declared order, not just one:
 *   @layer base, utilities;
 *   @import 'tailwindcss/utilities.css' layer(utilities);
 *   @import './reset.css' layer(base);
 *
 * `@layer base, utilities;` fixes the relative priority regardless of import
 * order: `base` (reset) is declared first, so it has LOWER priority —
 * `utilities` (Tailwind) always beats it. Layering reset ALONE (without also
 * declaring this order, or without layering reset at all) is not enough:
 * skip the explicit order and Tailwind utilities also need this file's
 * content-encounter order to happen to match, which the raw compile does NOT
 * guarantee (Tailwind's utilities import is physically first in
 * `lib/styles/css/index.css`, reset second — so without the explicit
 * `@layer base, utilities;` statement, reset would end up HIGHER priority
 * than utilities, the wrong way round). And per CSS Cascade Layers, ANY
 * unlayered style beats ANY layered style regardless of specificity — so an
 * unlayered CSS Module rule still wins against both tiers, and root.css /
 * global.css (deliberately left unlayered) still win against reset.
 *
 * Manually verified against a full Next.js production build + real browser
 * (`playwright-core`, computed styles): a Tailwind utility (`w-[160px]`)
 * beats reset's `all: unset` on a reset-touched `<button>` (160px, not
 * collapsed), and a CSS Module rule beats that same Tailwind utility (80px,
 * not 160px). Not re-run here — spinning up a server per `bun test` run is
 * disproportionate for a unit test; this file instead asserts the same
 * contract at the compiled-CSS-text level, which is what actually breaks
 * when someone reverts the fix.
 *
 * On failure: someone reverted the layer setup in `lib/styles/css/index.css`.
 * Put the `@layer base, utilities;` declaration and both `layer(...)` import
 * modifiers back.
 *
 * Run with: bun test lib/styles/scripts/utility-layering.test.ts
 */

import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

import tailwind from '@tailwindcss/postcss'
import postcss from 'postcss'

const repoRoot = join(import.meta.dir, '..', '..', '..')
const indexCssPath = join(repoRoot, 'lib/styles/css/index.css')

/** Byte range `[start, end)` of the first top-level `@layer <name> { ... }` block found from `from`. */
function findLayerBlock(
  css: string,
  name: string,
  from = 0
): { bodyStart: number; bodyEnd: number } | undefined {
  const marker = new RegExp(`@layer\\s+${name}\\s*\\{`)
  const match = marker.exec(css.slice(from))
  if (!match) return undefined

  const headerStart = from + match.index
  const bodyStart = css.indexOf('{', headerStart) + 1
  let depth = 1
  let i = bodyStart
  while (depth > 0 && i < css.length) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') depth--
    i++
  }
  return { bodyStart, bodyEnd: i - 1 }
}

async function compile() {
  const source = await Bun.file(indexCssPath).text()
  const result = await postcss([tailwind()]).process(source, {
    from: indexCssPath,
  })
  return result.css
}

describe('cascade layer order (source)', () => {
  it("declares '@layer base, utilities;' with base first — base must be the lower-priority layer", async () => {
    const source = await Bun.file(indexCssPath).text()
    expect(source).toMatch(/@layer\s+base\s*,\s*utilities\s*;/)
  })

  it("imports reset.css with the 'base' layer modifier", async () => {
    const source = await Bun.file(indexCssPath).text()
    expect(source).toMatch(/@import\s+['"]\.\/reset\.css['"]\s+layer\(base\)/)
  })

  it("imports tailwindcss/utilities.css with the 'utilities' layer modifier", async () => {
    const source = await Bun.file(indexCssPath).text()
    expect(source).toMatch(
      /@import\s+['"]tailwindcss\/utilities\.css['"]\s+layer\(utilities\)/
    )
  })
})

describe('cascade layer order (compiled output)', () => {
  it('reset.css compiles inside @layer base', async () => {
    const css = await compile()

    const base = findLayerBlock(css, 'base')
    expect(base).toBeDefined()
    if (!base) return

    const layerBody = css.slice(base.bodyStart, base.bodyEnd)
    // The reset's signature rule (lib/styles/css/reset.css).
    expect(layerBody).toMatch(/all:\s*unset/)
  })

  it('compiles Tailwind utilities (built-in and custom @utility) inside @layer utilities', async () => {
    const css = await compile()

    const utilities = findLayerBlock(css, 'utilities')
    expect(utilities).toBeDefined()
    if (!utilities) return

    const layerBody = css.slice(utilities.bodyStart, utilities.bodyEnd)

    // A stock Tailwind utility.
    expect(layerBody).toMatch(/\.block\s*\{[^}]*display:\s*block/)
    // A custom @utility from lib/styles/css/tailwind.css — proves custom
    // utilities ride the same layer as Tailwind's built-ins, not just the
    // stock ones.
    expect(layerBody).toMatch(/\.h1\s*\{/)
  })

  it('root.css/global.css stay unlayered — outside both @layer base and @layer utilities', async () => {
    const css = await compile()

    const base = findLayerBlock(css, 'base')
    const utilities = findLayerBlock(css, 'utilities')
    expect(base).toBeDefined()
    expect(utilities).toBeDefined()
    if (!(base && utilities)) return

    // `overscroll-behavior: none` is a global.css marker (the `body` rule).
    // It must sit outside both layer bodies — unlayered CSS beats every
    // layer regardless of specificity, which is what lets a CSS Module
    // override reset AND utilities.
    const globalIndex = css.indexOf('overscroll-behavior: none')
    expect(globalIndex).toBeGreaterThan(-1)
    const insideBase =
      globalIndex >= base.bodyStart && globalIndex < base.bodyEnd
    const insideUtilities =
      globalIndex >= utilities.bodyStart && globalIndex < utilities.bodyEnd
    expect(insideBase).toBe(false)
    expect(insideUtilities).toBe(false)
  })

  it('only two named layers exist — nothing accidentally landed in a third', async () => {
    const css = await compile()
    // `@layer properties` is Tailwind's own internal @property-fallback
    // layer — expected and unrelated to this contract.
    const namedLayerBlocks = (
      css.match(/@layer\s+([a-z]+)\s*\{/gi) ?? []
    ).filter((block) => !block.includes('properties'))
    expect(namedLayerBlocks).toHaveLength(2)
    const names = namedLayerBlocks
      .map((block) => block.match(/@layer\s+([a-z]+)/i)?.[1])
      .sort((a, b) => (a ?? '').localeCompare(b ?? ''))
    expect(names).toEqual(['base', 'utilities'])
  })
})
