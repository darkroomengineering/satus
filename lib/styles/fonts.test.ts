/**
 * Font variable-axis invariant
 *
 * `lib/styles/fonts.ts` calls `next/font/google` loaders. Passing an explicit
 * `weight` array to a family that ships a variable `wght` axis makes Next
 * download a separate static file per weight instead of one variable file,
 * and makes in-between weights snap to the nearest loaded one. That was a
 * real, silent bug here — it broke no build, test, lint, or typecheck.
 *
 * This test parses `lib/styles/fonts.ts` as text (never imported — importing
 * `next/font/google` outside a Next build fails) and cross-references each
 * font family against Next's own font metadata: if the family ships a
 * "variable" weight, the call must not pass an explicit `weight` option.
 */

import { describe, expect, it } from 'bun:test'

const FONT_DATA_PATH =
  'node_modules/next/dist/compiled/@next/font/dist/google/font-data.json'

type FontMetadata = Record<string, { weights: string[] }>

/** `Spline_Sans_Mono` -> `Spline Sans Mono` (the next/font/google JSON key). */
function identifierToFamily(identifier: string): string {
  return identifier.replace(/_/g, ' ')
}

async function loadFontMetadata(): Promise<FontMetadata | undefined> {
  const file = Bun.file(FONT_DATA_PATH)
  if (!(await file.exists())) return undefined
  return (await file.json()) as FontMetadata
}

/** One `SomeFont({ ... })` call site extracted from lib/styles/fonts.ts. */
interface FontCall {
  identifier: string
  optionsText: string
}

/**
 * Extract every `Identifier({ ... })` call from the imported next/font/google
 * bindings, matching balanced braces so a nested object option (e.g. a future
 * `fallback: [...]`) doesn't truncate the match early.
 */
function extractFontCalls(source: string, identifiers: string[]): FontCall[] {
  const calls: FontCall[] = []

  for (const identifier of identifiers) {
    const callRegex = new RegExp(`${identifier}\\(\\s*\\{`, 'g')
    while (true) {
      const match = callRegex.exec(source)
      if (!match) break
      const openBraceIndex = match.index + match[0].length - 1
      let depth = 1
      let index = openBraceIndex + 1
      while (index < source.length && depth > 0) {
        if (source[index] === '{') depth++
        else if (source[index] === '}') depth--
        index++
      }
      calls.push({
        identifier,
        optionsText: source.slice(openBraceIndex + 1, index - 1),
      })
    }
  }

  return calls
}

describe('font variable-axis invariant (lib/styles/fonts.ts)', () => {
  it('never passes an explicit weight[] to a family that ships a variable axis', async () => {
    const metadata = await loadFontMetadata()
    if (!metadata) return // font-data.json absent — skip, not a real failure

    const source = await Bun.file('lib/styles/fonts.ts').text()

    // Import identifiers come from `import { A, B } from 'next/font/google'`
    const importMatch =
      /import\s*\{([^}]+)\}\s*from\s*['"]next\/font\/google['"]/.exec(source)
    expect(importMatch).not.toBeNull()
    const identifiers = (importMatch?.[1] ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
    expect(identifiers.length).toBeGreaterThan(0)

    const calls = extractFontCalls(source, identifiers)
    expect(calls.length).toBeGreaterThan(0)

    for (const call of calls) {
      const family = identifierToFamily(call.identifier)
      const familyMetadata = metadata[family]
      if (!familyMetadata) continue // unknown family — not this test's concern

      const isVariable = familyMetadata.weights.includes('variable')
      if (!isVariable) continue

      expect(
        /\bweight\s*:/.test(call.optionsText),
        `"${family}" ships a variable axis (weights: ${familyMetadata.weights.join(', ')}) ` +
          `but ${call.identifier}({ ... }) in lib/styles/fonts.ts passes an explicit weight — ` +
          'this downloads a static file per weight instead of one variable file.'
      ).toBe(false)
    }
  })
})
