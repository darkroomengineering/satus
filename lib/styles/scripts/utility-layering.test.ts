/**
 * Guards the cascade contract: consumer CSS Module > Tailwind utility >
 * component CSS Module > browser reset.
 *
 * A component that exposes `className` wraps its module in `@layer components`
 * so a consumer's utility can override it (AGENTS.md § Styling split). No global
 * stylesheet has a block in that layer, so `index.css` must NAME it in the
 * order declaration; otherwise the first component module to load creates it
 * after `utilities` and inverts the rule.
 *
 * Without `layer()` modifiers, `@import 'tailwindcss/utilities.css'` compiles
 * every utility unlayered, at the same tier as `reset.css`'s `all: unset` and
 * any unlayered CSS Module, so the winner depends on load order and
 * specificity. Layering the imports alone is not enough; the fix needs all of:
 *   @layer base, components, utilities;
 *   @import 'tailwindcss/utilities.css' layer(utilities);
 *   @import './reset.css' layer(base);
 * Without the explicit order, priority follows content-encounter order, and
 * Tailwind's import is physically first in `index.css`, so reset would end up
 * HIGHER than utilities. Any unlayered style beats any layered one regardless
 * of specificity, so an unlayered CSS Module still wins against both tiers, and
 * root.css / global.css (deliberately unlayered) still win against reset.
 *
 * Verified once against a production build in a real browser: `w-[160px]` beats
 * reset's `all: unset` on a `<button>` (160px), and a CSS Module rule beats that
 * utility (80px). Not re-run here; this file asserts the same contract on the
 * compiled CSS text, which is what breaks when someone reverts the fix.
 *
 * On failure: someone reverted the layer setup in `lib/styles/css/index.css`.
 * Restore the `@layer base, components, utilities;` declaration and both
 * `layer(...)` import modifiers. If the component-module test fails, wrap that
 * module in `@layer components { ... }`.
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
  it("declares '@layer base, components, utilities;' in that order — each later layer beats the one before", async () => {
    const source = await Bun.file(indexCssPath).text()
    expect(source).toMatch(/@layer\s+base\s*,\s*components\s*,\s*utilities\s*;/)
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
    expect(layerBody).toMatch(/all:\s*unset/)
  })

  it('compiles Tailwind utilities (built-in and custom @utility) inside @layer utilities', async () => {
    const css = await compile()

    const utilities = findLayerBlock(css, 'utilities')
    expect(utilities).toBeDefined()
    if (!utilities) return

    const layerBody = css.slice(utilities.bodyStart, utilities.bodyEnd)

    expect(layerBody).toMatch(/\.block\s*\{[^}]*display:\s*block/)
    // Custom `@utility` from tailwind.css rides the same layer as built-ins.
    expect(layerBody).toMatch(/\.h1\s*\{/)
  })

  it('root.css/global.css stay unlayered — outside both @layer base and @layer utilities', async () => {
    const css = await compile()

    const base = findLayerBlock(css, 'base')
    const utilities = findLayerBlock(css, 'utilities')
    expect(base).toBeDefined()
    expect(utilities).toBeDefined()
    if (!(base && utilities)) return

    // `overscroll-behavior: none` marks global.css (the `body` rule). It must sit
    // outside both layer bodies: unlayered CSS beats every layer, which is what
    // lets a CSS Module override reset AND utilities.
    const globalIndex = css.indexOf('overscroll-behavior: none')
    expect(globalIndex).toBeGreaterThan(-1)
    const insideBase =
      globalIndex >= base.bodyStart && globalIndex < base.bodyEnd
    const insideUtilities =
      globalIndex >= utilities.bodyStart && globalIndex < utilities.bodyEnd
    expect(insideBase).toBe(false)
    expect(insideUtilities).toBe(false)
  })

  it('only base and utilities have blocks in the global stylesheet — components is declared but stays empty here', async () => {
    const css = await compile()
    // `@layer properties` is Tailwind's own @property-fallback layer, unrelated
    // here. `components` is declared but only component modules fill it.
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

describe('component modules are layered', () => {
  it("every module beside a component that merges `className` is wrapped in '@layer components' (or 'utilities')", async () => {
    // `cn(s.x, className)` promises the consumer's className wins, which holds
    // only when the module is layered: an unlayered rule beats every utility.
    // `image.module.css` layers into `utilities` on purpose (Tailwind
    // `object-*` beats it by specificity), so either layer name passes.
    const glob = new Bun.Glob('{components,lib}/**/*.tsx')
    const offenders: string[] = []
    for await (const tsxPath of glob.scan({ cwd: repoRoot })) {
      const tsx = await Bun.file(join(repoRoot, tsxPath)).text()
      if (!/\bcn\([^)]*\bclassName\b/.test(tsx)) continue
      const moduleImport = tsx.match(/from\s+'\.\/([\w-]+\.module\.css)'/)
      if (!moduleImport?.[1]) continue
      const modulePath = join(tsxPath, '..', moduleImport[1])
      const css = await Bun.file(join(repoRoot, modulePath)).text()
      const body = css.replace(/\/\*[\s\S]*?\*\//g, '').trim()
      if (!/^@layer\s+(components|utilities)\s*\{/.test(body)) {
        offenders.push(modulePath)
      }
    }
    expect(offenders).toEqual([])
  })
})
