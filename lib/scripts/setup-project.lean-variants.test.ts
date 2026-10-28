import { beforeAll, describe, expect, it } from 'bun:test'

import { Project, ts } from 'ts-morph'

import { applyOpsToText } from './ast-transforms'
import { INTEGRATION_BUNDLES } from './integration-bundles'
import { loadSourceFiles, sourceFiles } from './setup-project.test-helpers'

beforeAll(loadSourceFiles)

// The shared webhook route must compile in EVERY keep-combination. These
// assert the VALIDITY of each variant's output, not strip/re-add mechanics:
// the sanity strip once removed the `NextResponse` import the neutral block
// still called and deleted the handler's terminal returns, so a blank or
// shopify-only scaffold failed its first `bun run check` (TS2304 plus
// noImplicitReturns).

describe('Lean-variant validity: app/api/revalidate/route.ts (H1)', () => {
  const FILE = 'app/api/revalidate/route.ts'

  const transformFor = (
    bundleName: 'sanity' | 'shopify',
    phase: 'strip' | 'add'
  ) => {
    const bundle = INTEGRATION_BUNDLES[bundleName]
    const transforms =
      phase === 'strip' ? bundle?.codeTransforms : (bundle?.addTransforms ?? [])
    return transforms?.find((t) => t.file === FILE)
  }

  /**
   * Reproduce what `setup()` does to this file for a given kept set:
   * `setupLean` applies EVERY bundle's strip ops against the pristine source
   * (a union pass, regardless of what is kept), then `setupAddIntegrations`
   * re-adds each kept bundle and runs `stripAbsentIntegrationWiring`, which
   * re-applies each absent bundle's strip ops with `required` downgraded.
   */
  const variantFor = (kept: ('sanity' | 'shopify')[]): string | undefined => {
    const pristine = sourceFiles[FILE]
    if (!pristine) return undefined

    let text = pristine
    for (const id of ['sanity', 'shopify'] as const) {
      const strip = transformFor(id, 'strip')
      if (strip) text = applyOpsToText(text, strip.ops)
    }
    for (const id of kept) {
      const add = transformFor(id, 'add')
      if (add) text = applyOpsToText(text, add.ops)
    }
    if (kept.length === 0) return text // setupAddIntegrations returns early
    for (const id of ['sanity', 'shopify'] as const) {
      if (kept.includes(id)) continue
      const strip = transformFor(id, 'strip')
      if (!strip) continue
      const downgraded = strip.ops.map((op) => ({ ...op, required: false }))
      text = applyOpsToText(text, downgraded)
    }
    return text
  }

  /**
   * Type-check a variant under the repo's strict flags with its imports
   * stubbed, asserting the route's own validity (unused parameters and
   * imports, implicit returns, dangling references), not the integrations'
   * types. False passes are closed: the strict flags are copied from
   * tsconfig.json, each stub declares only what the route uses (so a dangling
   * identifier fails), and the route is the only non-stub file (the guard
   * test below proves a known error surfaces).
   */
  const typeErrors = (variant: string): string[] => {
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'],
        strict: true,
        noEmit: true,
        verbatimModuleSyntax: true,
        exactOptionalPropertyTypes: true,
        noImplicitReturns: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noUncheckedIndexedAccess: true,
      },
    })
    project.createSourceFile(
      '/stubs.d.ts',
      `declare module 'next/server' {
  export class NextRequest extends Request {
    nextUrl: URL
  }
  export class NextResponse extends Response {
    static json(body: unknown, init?: ResponseInit): NextResponse
  }
}
declare module '@/integrations/sanity/revalidate' {
  import type { NextRequest, NextResponse } from 'next/server'
  export function revalidate(request: NextRequest): Promise<NextResponse>
}
declare module '@/integrations/shopify/revalidate' {
  import type { NextRequest, NextResponse } from 'next/server'
  export function revalidate(request: NextRequest): Promise<NextResponse>
}
`
    )
    project.createSourceFile('/route.ts', variant)
    return project.getPreEmitDiagnostics().map((d) => {
      const message = d.getMessageText()
      const text =
        typeof message === 'string' ? message : message.getMessageText()
      return `${d.getSourceFile()?.getFilePath() ?? '?'} TS${d.getCode()}: ${text}`
    })
  }

  it('the type check catches the unused-parameter bug it was written for', () => {
    // Without the `_request` rename, a blank scaffold failed TS6133.
    const blank = variantFor([])
    if (blank === undefined) return
    const unrenamed = blank.replace('(_request:', '(request:')
    expect(unrenamed).not.toBe(blank)
    expect(typeErrors(unrenamed).join('\n')).toContain('TS6133')
  })

  const combinations: {
    label: string
    kept: ('sanity' | 'shopify')[]
  }[] = [
    { label: 'both kept', kept: ['sanity', 'shopify'] },
    { label: 'both kept, shopify first', kept: ['shopify', 'sanity'] },
    { label: 'sanity only', kept: ['sanity'] },
    { label: 'shopify only', kept: ['shopify'] },
    { label: 'blank', kept: [] },
  ]

  for (const { label, kept } of combinations) {
    describe(label, () => {
      it('type-checks under the repo strict flags', () => {
        const variant = variantFor(kept)
        if (variant === undefined) return

        expect(typeErrors(variant)).toEqual([])
      })

      it('references NextResponse only while its import survives', () => {
        const variant = variantFor(kept)
        if (variant === undefined) return

        if (variant.includes('NextResponse.')) {
          expect(variant).toContain("from 'next/server'")
          expect(variant).toMatch(/import \{[^}]*NextResponse[^}]*\} from/)
        }
      })

      it('ends the POST handler on a return statement', () => {
        const variant = variantFor(kept)
        if (variant === undefined) return

        // Statements at POST's top level start at a two-space indent; the
        // character class drops comment lines and the closing brackets of
        // multi-line statements. The last such line must be the
        // provider-neutral fallback return, or the handler falls through and
        // `noImplicitReturns` rejects the file.
        const topLevelStatements = variant
          .split('\n')
          .filter((line) => /^ {2}(?![)\]}/*])\S/.test(line))
        const last = topLevelStatements.at(-1)
        expect(last).toBe('  return NextResponse.json(')
        expect(variant).toContain("error: 'No webhook handler configured'")
      })

      it('keeps the pristine guard order: Shopify, then Sanity, then the 404', () => {
        const pristine = sourceFiles[FILE]
        const variant = variantFor(kept)
        if (pristine === undefined || variant === undefined) return

        // The order is behaviour: a request carrying both a `?secret=` and a
        // `sanity-webhook-signature` header goes to whichever guard is first.
        const handler = (text: string) =>
          text
            .slice(text.indexOf('export async function POST'))
            .split('\n')
            .filter((line) => line.trim() !== '')
        const got = handler(variant)
        const positions = [
          'const isShopifyWebhook',
          'const isSanityWebhook',
          "error: 'No webhook handler configured'",
        ]
          .map((marker) => got.findIndex((line) => line.includes(marker)))
          .filter((index) => index !== -1)
        expect(positions).toEqual([...positions].sort((a, b) => a - b))

        // With both kept, the handler matches the pristine one line for line.
        // Blank lines are dropped: the strip leaves one that `setup:project`'s
        // format pass removes.
        if (kept.length === 2) expect(got).toEqual(handler(pristine))
      })

      it('leaves no reference to a stripped integration', () => {
        const variant = variantFor(kept)
        if (variant === undefined) return

        for (const id of ['sanity', 'shopify'] as const) {
          if (kept.includes(id)) continue
          expect(variant).not.toContain(`@/integrations/${id}/revalidate`)
          expect(variant).not.toContain(`${id}Revalidate`)
          // Comments too: a blank or single-provider route must not describe
          // a provider it no longer has.
          expect(variant.toLowerCase()).not.toContain(id)
        }
      })
    })
  }
})

// The same validity gate for lib/seo/routes.ts: a partial strip once stubbed
// `getCmsRoutes` while `buildRoutesFromDocuments` and `fetchCmsRoutesResult`
// still read the deleted schema, query, and helpers (six TS2304s). Sanity
// restores this file wholesale via overwriteFiles (single-owner), so a
// kept-sanity variant IS the pristine file; only the stripped variant needs
// asserting.

describe('Lean-variant validity: lib/seo/routes.ts', () => {
  const FILE = 'lib/seo/routes.ts'

  const stripTransform = INTEGRATION_BUNDLES.sanity?.codeTransforms.find(
    (t) => t.file === FILE
  )

  const variantFor = (kept: ('sanity' | 'shopify')[]): string | undefined => {
    const pristine = sourceFiles[FILE]
    if (!(pristine && stripTransform)) return undefined
    return kept.includes('sanity')
      ? pristine
      : applyOpsToText(pristine, stripTransform.ops)
  }

  const combinations: ('sanity' | 'shopify')[][] = [
    ['sanity', 'shopify'],
    ['sanity'],
    ['shopify'],
    [],
  ]

  for (const kept of combinations) {
    const label = kept.length > 0 ? kept.join(' + ') : 'blank'

    it(`keeps the exported route API (${label})`, () => {
      const variant = variantFor(kept)
      if (variant === undefined) return

      expect(variant).toContain('export function buildRoutesFromDocuments')
      expect(variant).toContain('export async function getCmsRoutes(')
      expect(variant).toContain('export async function getCmsRoutesResult(')
      expect(variant).toContain('export { STATIC_ROUTES }')
    })

    it(`references nothing the strip removed (${label})`, () => {
      const variant = variantFor(kept)
      if (variant === undefined || kept.includes('sanity')) return

      // Derived from the ops themselves, so a new op is covered the day it
      // lands: whatever the strip deletes must not be referenced afterwards.
      for (const op of stripTransform?.ops ?? []) {
        if (op.kind === 'removeImport') {
          expect(variant).not.toContain(op.specifier)
        }
        if (op.kind === 'removeVariableStatement') {
          expect(variant).not.toContain(op.name)
        }
      }

      // The identifiers those imports provided, which a partial strip leaves
      // behind inside the two un-stubbed functions.
      for (const identifier of [
        'sanityFetch',
        'urlForReference',
        'isConfigured',
        'defineQuery',
      ]) {
        expect(variant).not.toContain(identifier)
      }
    })
  }

  it('is idempotent when re-applied to an already-lean file', () => {
    const lean = variantFor([])
    if (!(lean && stripTransform)) return

    const downgraded = stripTransform.ops.map((op) => ({
      ...op,
      required: false,
    }))
    expect(applyOpsToText(lean, downgraded)).toBe(lean)
  })
})
