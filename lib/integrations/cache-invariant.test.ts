/**
 * Cache Components invariant
 *
 * `next.config.ts` sets `cacheComponents: true`. Under it, an uncached async
 * data read inside a Server Component silently opts the *entire route* out
 * of static rendering — no build error, no test failure, no typecheck
 * failure. That is exactly what was wrong with the Shopify data layer here:
 * `products.ts`/`collections.ts`/`pages.ts` read the storefront catalog
 * without `'use cache'`, so every page that rendered a product silently
 * became fully dynamic.
 *
 * The invariant: every exported `async` function under `lib/integrations/**`
 * that performs a network read (references `fetch(`, `shopifyFetch`, or
 * `sanityFetch`) must either contain a `'use cache'` directive, or be
 * exempt for one of three reasons, in this precedence:
 *
 *  1. The file has `'use server'` at the top — Server Actions and mutations
 *     must never be cached.
 *  2. The call passes `cache: 'no-store'` — a deliberate per-user or
 *     mutation read (e.g. `lib/integrations/shopify/cart-operations.ts`).
 *  3. The function (or file) carries a `// cache-exempt: <reason>` comment
 *     — a conscious, documented opt-out (e.g. the shared `shopifyFetch`
 *     wrapper in `lib/integrations/shopify/client.ts`, used by both cached
 *     and uncached callers).
 *
 * This walks the AST (via ts-morph) rather than hardcoding file/function
 * names, so it survives `setup:project` pruning whole integrations: if
 * `lib/integrations/shopify/` doesn't exist, its functions simply aren't in
 * the scan, and the test has nothing to say about it.
 */

import { describe, expect, it } from 'bun:test'

import { Project, SyntaxKind } from 'ts-morph'
import type {
  ArrowFunction,
  FunctionDeclaration,
  FunctionExpression,
  SourceFile,
} from 'ts-morph'

const NETWORK_READ_PATTERNS = [
  /\bfetch\(/,
  /fetchWithTimeout/,
  /shopifyFetch/,
  /sanityFetch/,
]
const CACHE_EXEMPT_PATTERN = /\/\/\s*cache-exempt:/

/** Is `'use server'` the first statement in the file? */
function fileHasUseServerDirective(sourceFile: SourceFile): boolean {
  const first = sourceFile.getStatements()[0]
  if (!first || !first.isKind(SyntaxKind.ExpressionStatement)) return false
  const text = first.getText().trim()
  return text === "'use server'" || text === '"use server"'
}

/** Does the very first (top-of-file) comment carry a file-level exemption? */
function fileHasCacheExemptHeader(sourceFile: SourceFile): boolean {
  const first = sourceFile.getStatements()[0]
  if (!first) return false
  // getFullText() on the first statement includes any leading trivia
  // (comments) that sit before it — i.e. a top-of-file comment block.
  return CACHE_EXEMPT_PATTERN.test(first.getFullText())
}

type FunctionLike = FunctionDeclaration | ArrowFunction | FunctionExpression

interface CandidateFunction {
  name: string
  fn: FunctionLike
}

/** Every exported, async, top-level function in the file (declarations and `export const x = async (...) => {}`). */
function getExportedAsyncFunctions(
  sourceFile: SourceFile
): CandidateFunction[] {
  const candidates: CandidateFunction[] = []

  for (const fn of sourceFile.getFunctions()) {
    if (fn.isExported() && fn.isAsync()) {
      const name = fn.getName()
      if (name) candidates.push({ name, fn })
    }
  }

  for (const varStatement of sourceFile.getVariableStatements()) {
    if (!varStatement.isExported()) continue
    for (const decl of varStatement.getDeclarations()) {
      const initializer = decl.getInitializer()
      if (!initializer) continue
      const isFunctionLike =
        initializer.isKind(SyntaxKind.ArrowFunction) ||
        initializer.isKind(SyntaxKind.FunctionExpression)
      if (isFunctionLike && initializer.isAsync()) {
        candidates.push({ name: decl.getName(), fn: initializer })
      }
    }
  }

  return candidates
}

/** First statement of the function body is the `'use cache'` directive. */
function hasUseCacheDirective(fn: FunctionLike): boolean {
  const body = fn.getBody()
  if (!body || !body.isKind(SyntaxKind.Block)) return false
  const first = body.getStatements()[0]
  if (!first || !first.isKind(SyntaxKind.ExpressionStatement)) return false
  const text = first.getText().trim()
  return text === "'use cache'" || text === '"use cache"'
}

function bodyText(fn: FunctionLike): string {
  return fn.getBody()?.getText() ?? ''
}

function performsNetworkRead(fn: FunctionLike): boolean {
  // Full text (not just the body) so a wrapper whose *own name* is
  // shopifyFetch/sanityFetch — the thing that actually issues the
  // request — counts as a network read, not just its callers.
  const text = fn.getFullText()
  return NETWORK_READ_PATTERNS.some((pattern) => pattern.test(text))
}

/**
 * A read that's genuinely, permanently uncached (a per-user or mutation
 * read like cart-operations.ts) never calls `cacheTag`/`cacheLife` — those
 * are the Cache Components APIs a function reaches for specifically to
 * declare caching intent.
 *
 * A `'use cache'`-wrapped catalog read (products.ts et al.) also passes
 * `cache: 'no-store'` to its inner fetch call — deliberately, to avoid the
 * fetch-level cache holding a second, independently-stale copy alongside
 * the outer Cache Components entry (see PR #324). Treating that
 * `cache: 'no-store'` as an automatic exemption would make removing
 * `'use cache'` from such a function invisible to this test — exactly the
 * silent regression this test exists to catch. So exemption 2 only counts
 * when the function shows no other caching intent.
 */
function passesNoStore(fn: FunctionLike): boolean {
  const text = bodyText(fn)
  const hasNoStore = /cache:\s*['"]no-store['"]/.test(text)
  const declaresCachingIntent = /\bcacheTag\(|\bcacheLife\(/.test(text)
  return hasNoStore && !declaresCachingIntent
}

/** Comment directly attached to this function (leading trivia) or inside its body. */
function hasFunctionCacheExemptComment(fn: FunctionLike): boolean {
  return (
    CACHE_EXEMPT_PATTERN.test(fn.getFullText()) ||
    CACHE_EXEMPT_PATTERN.test(bodyText(fn))
  )
}

describe('Cache Components invariant (uncached network reads under lib/integrations/**)', () => {
  const project = new Project({ skipAddingFilesFromTsConfig: true })
  project.addSourceFilesAtPaths([
    'lib/integrations/**/*.ts',
    'lib/integrations/**/*.tsx',
    '!lib/integrations/**/*.test.ts',
    '!lib/integrations/**/*.test.tsx',
  ])
  const sourceFiles = project.getSourceFiles()

  // Sanity check on the scan itself — if this is ever 0, the glob broke and
  // every assertion below would trivially (and silently) pass.
  it('scans at least one source file', () => {
    expect(sourceFiles.length).toBeGreaterThan(0)
  })

  for (const sourceFile of sourceFiles) {
    const relativePath =
      sourceFile.getFilePath().split('/satus/').at(-1) ??
      sourceFile.getFilePath()
    const candidates = getExportedAsyncFunctions(sourceFile)
    if (candidates.length === 0) continue

    const fileIsServerAction = fileHasUseServerDirective(sourceFile)
    const fileHasHeaderExemption = fileHasCacheExemptHeader(sourceFile)

    for (const { name, fn } of candidates) {
      if (!performsNetworkRead(fn)) continue

      it(`${relativePath}: ${name}() is cached or exempt`, () => {
        const exempt =
          fileIsServerAction ||
          fileHasHeaderExemption ||
          passesNoStore(fn) ||
          hasFunctionCacheExemptComment(fn)

        expect(
          hasUseCacheDirective(fn) || exempt,
          `${relativePath}: exported async function "${name}" performs a network read ` +
            "but has neither a 'use cache' directive nor a documented exemption " +
            "('use server' at the top of the file, cache: 'no-store', or a " +
            '// cache-exempt: comment). Under cacheComponents, this silently opts ' +
            'the whole route out of static rendering.'
        ).toBe(true)
      })
    }
  }
})
