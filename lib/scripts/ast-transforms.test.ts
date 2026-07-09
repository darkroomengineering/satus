/**
 * Unit tests for the additive AST operations in the transform engine
 *
 * Run with: bun test lib/scripts/ast-transforms.test.ts
 *
 * Every additive op must be:
 * 1. Effective — it inserts the construct when absent
 * 2. Idempotent — it returns the source byte-for-byte unchanged when present
 *    (the issue constraint: "add x twice is a no-op")
 * 3. Format-resilient — it works on compact / quoted-key / multiline variants
 *
 * Plus round-trip tests: remove-then-add (and add-then-remove) on a realistic
 * next.config-shaped fixture leaves the value present exactly once (or absent).
 */

import { describe, expect, it } from 'bun:test'
import type { AstOperation } from './ast-operation-types'
import { applyOpsToText } from './ast-transforms'

/** Number of times `needle` occurs in `haystack`. */
function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const nextConfigFixture = `const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      'gsap',
      'three',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
    ],
  },
}

export default nextConfig
`

// Compact / quoted-key variant — same semantics, hostile formatting.
const compactConfigFixture = `const nextConfig = {
  experimental: { optimizePackageImports: ["gsap","three"] },
  images: { remotePatterns: [{"protocol":"https","hostname":"cdn.shopify.com"}] },
}
`

// ---------------------------------------------------------------------------
// removeCallArgument
// ---------------------------------------------------------------------------

describe('removeCallArgument', () => {
  const op: AstOperation = {
    kind: 'removeCallArgument',
    callee: 'useContextBridge',
    argument: 'SheetContext',
  }

  it('drops the named argument and is idempotent', () => {
    const fixture = `const Bridge = useContextBridge(TransformContext, SheetContext)\n`
    const result = applyOpsToText(fixture, [op])
    expect(result).toContain('useContextBridge(TransformContext)')
    expect(result).not.toContain('SheetContext')
    // Removing again is a no-op.
    expect(applyOpsToText(result, [op])).toBe(result)
  })

  it('is an exact no-op when the argument is already absent', () => {
    const fixture = `const Bridge = useContextBridge(TransformContext)\n`
    expect(applyOpsToText(fixture, [op])).toBe(fixture)
  })

  it('leaves calls to other callees untouched', () => {
    const fixture = `useOther(TransformContext, SheetContext)\n`
    expect(applyOpsToText(fixture, [op])).toBe(fixture)
  })
})

// ---------------------------------------------------------------------------
// removeIfStatement
// ---------------------------------------------------------------------------

describe('removeIfStatement', () => {
  const op: AstOperation = {
    kind: 'removeIfStatement',
    conditionContains: 'isShopifyWebhook',
  }

  it('removes the matching if statement and is idempotent', () => {
    const fixture = `function handler() {
  const isShopifyWebhook = true

  if (isShopifyWebhook) {
    return shopifyRevalidate()
  }

  return null
}
`
    const result = applyOpsToText(fixture, [op])
    expect(result).not.toContain('if (isShopifyWebhook)')
    expect(result).not.toContain('shopifyRevalidate()')
    expect(result).toContain('return null')
    // Removing again is a no-op.
    expect(applyOpsToText(result, [op])).toBe(result)
  })

  it('is an exact no-op when no if-statement matches the condition', () => {
    const fixture = `function handler() {
  if (otherCondition) {
    return null
  }
  return true
}
`
    expect(applyOpsToText(fixture, [op])).toBe(fixture)
  })

  it('leaves if-statements with a different condition untouched', () => {
    const fixture = `function handler() {
  if (isSanityWebhook) {
    return sanityRevalidate()
  }
  if (isShopifyWebhook) {
    return shopifyRevalidate()
  }
  return null
}
`
    const result = applyOpsToText(fixture, [op])
    expect(result).toContain('if (isSanityWebhook)')
    expect(result).toContain('sanityRevalidate()')
    expect(result).not.toContain('isShopifyWebhook')
    expect(result).not.toContain('shopifyRevalidate')
  })

  it('matches a compound condition via substring (either signal routes to the guard)', () => {
    const fixture = `function handler() {
  const isShopifyWebhook = a || b
  if (isShopifyWebhook) {
    return shopifyRevalidate()
  }
  return null
}
`
    const result = applyOpsToText(fixture, [op])
    expect(result).not.toContain('if (isShopifyWebhook)')
  })

  it('removes every matching if-statement in the file', () => {
    const fixture = `function a() {
  if (isShopifyWebhook) return 1
}
function b() {
  if (isShopifyWebhook) return 2
}
`
    const result = applyOpsToText(fixture, [op])
    expect(result).not.toContain('isShopifyWebhook')
  })
})

// ---------------------------------------------------------------------------
// Shopify webhook dispatch strip — composed ops against a route.ts-shaped
// fixture (removeImport + removeVariableStatement + removeIfStatement)
// ---------------------------------------------------------------------------

describe('Shopify webhook dispatch strip (composed ops)', () => {
  const routeFixture = `import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { parseBody } from 'next-sanity/webhook'
import { revalidate as shopifyRevalidate } from '@/integrations/shopify/revalidate'
import { getClientIP, rateLimit, rateLimiters } from '@/lib/utils/rate-limit'

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const rateLimitResult = rateLimit(\`revalidate:\${ip}\`, rateLimiters.standard)

  if (!rateLimitResult.success) {
    return new Response('Too many requests', { status: 429 })
  }

  const isShopifyWebhook =
    request.headers.has('x-shopify-topic') ||
    request.nextUrl.searchParams.has('secret')

  if (isShopifyWebhook) {
    return shopifyRevalidate(request)
  }

  try {
    const secret = process.env.SANITY_REVALIDATE_SECRET
    if (!secret) {
      return new Response('Webhook secret not configured', { status: 503 })
    }
    return NextResponse.json({ status: 200 })
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 })
  }
}
`

  const shopifyOps: AstOperation[] = [
    { kind: 'removeImport', specifier: '@/integrations/shopify/revalidate' },
    { kind: 'removeVariableStatement', name: 'isShopifyWebhook' },
    { kind: 'removeIfStatement', conditionContains: 'isShopifyWebhook' },
  ]

  it('removes the import, guard variable, and dispatch, keeping the rest of the route intact', () => {
    const result = applyOpsToText(routeFixture, shopifyOps)

    // Dangling import gone.
    expect(result).not.toContain('@/integrations/shopify/revalidate')
    expect(result).not.toContain('shopifyRevalidate')
    expect(result).not.toContain('isShopifyWebhook')

    // Untouched: rate limiting and the Sanity revalidation path.
    expect(result).toContain('rateLimit(')
    expect(result).toContain('SANITY_REVALIDATE_SECRET')
    expect(result).toContain('export async function POST')

    // Idempotent — re-applying to the already-stripped result changes nothing.
    expect(applyOpsToText(result, shopifyOps)).toBe(result)
  })
})

// ---------------------------------------------------------------------------
// addImport
// ---------------------------------------------------------------------------

describe('addImport', () => {
  const canvasImport: AstOperation = {
    kind: 'addImport',
    text: "import { Canvas } from '@/webgl/components/canvas'",
  }

  it('should insert after the last import when absent', () => {
    const fixture = `'use client'

import { Lenis } from 'lenis/react'
import { Theme } from '@/lib/theme'

export function Wrapper() {
  return null
}
`
    const result = applyOpsToText(fixture, [canvasImport])

    expect(result).toContain(
      "import { Canvas } from '@/webgl/components/canvas'"
    )
    // Placement: after the last existing import, before the function.
    expect(result.indexOf("'@/lib/theme'")).toBeLessThan(
      result.indexOf("'@/webgl/components/canvas'")
    )
    expect(result.indexOf("'@/webgl/components/canvas'")).toBeLessThan(
      result.indexOf('export function Wrapper')
    )
    // Adding twice is a no-op.
    expect(applyOpsToText(result, [canvasImport])).toBe(result)
  })

  it('should insert after the directive prologue when the file has no imports', () => {
    const fixture = `'use client'

export function Thing() {
  return null
}
`
    const result = applyOpsToText(fixture, [canvasImport])

    expect(result.indexOf("'use client'")).toBeLessThan(
      result.indexOf('import { Canvas }')
    )
    expect(result.indexOf('import { Canvas }')).toBeLessThan(
      result.indexOf('export function Thing')
    )
  })

  it('should merge missing named imports into an existing declaration', () => {
    const fixture = `import { Theme } from '@/lib/theme'

export const t = Theme
`
    const result = applyOpsToText(fixture, [
      {
        kind: 'addImport',
        text: "import { Theme, ThemeProvider } from '@/lib/theme'",
      },
    ])

    expect(result).toContain('ThemeProvider')
    // Merged, not duplicated — still a single declaration for the specifier.
    expect(count(result, "from '@/lib/theme'")).toBe(1)
    expect(count(result, 'import')).toBe(1)
  })

  it('should be an exact no-op when the import is already present', () => {
    const fixture = `import { Canvas } from '@/webgl/components/canvas'

export const c = Canvas
`
    expect(applyOpsToText(fixture, [canvasImport])).toBe(fixture)
  })

  it('should be an exact no-op for a multiline named import containing the binding', () => {
    const fixture = `import {
  Alpha,
  Beta,
} from '@/lib'

export const x = Alpha + Beta
`
    const result = applyOpsToText(fixture, [
      { kind: 'addImport', text: "import { Beta } from '@/lib'" },
    ])
    expect(result).toBe(fixture)
  })

  it('should merge into a multiline named import (formatting variant)', () => {
    const fixture = `import {
  Alpha,
  Beta,
} from '@/lib'

export const x = Alpha + Beta
`
    const result = applyOpsToText(fixture, [
      { kind: 'addImport', text: "import { Gamma } from '@/lib'" },
    ])

    expect(result).toContain('Gamma')
    expect(count(result, "from '@/lib'")).toBe(1)
    // Existing bindings survive the merge.
    expect(result).toContain('Alpha')
    expect(result).toContain('Beta')
  })
})

// ---------------------------------------------------------------------------
// addArrayStringElement
// ---------------------------------------------------------------------------

describe('addArrayStringElement', () => {
  const addLenis: AstOperation = {
    kind: 'addArrayStringElement',
    variableName: 'nextConfig',
    propertyPath: 'experimental.optimizePackageImports',
    value: 'lenis',
  }

  it('should append the string when absent', () => {
    const result = applyOpsToText(nextConfigFixture, [addLenis])

    expect(result).toContain("'lenis'")
    expect(count(result, 'lenis')).toBe(1)
    // Existing entries survive.
    expect(result).toContain("'gsap'")
    expect(result).toContain("'three'")
    // Adding twice is a no-op.
    expect(applyOpsToText(result, [addLenis])).toBe(result)
  })

  it('should be an exact no-op when the value is already present', () => {
    const result = applyOpsToText(nextConfigFixture, [
      {
        kind: 'addArrayStringElement',
        variableName: 'nextConfig',
        propertyPath: 'experimental.optimizePackageImports',
        value: 'gsap',
      },
    ])
    expect(result).toBe(nextConfigFixture)
  })

  it('should match across quote styles (exact no-op on double-quoted source)', () => {
    const result = applyOpsToText(compactConfigFixture, [
      {
        kind: 'addArrayStringElement',
        variableName: 'nextConfig',
        propertyPath: 'experimental.optimizePackageImports',
        value: 'gsap',
      },
    ])
    expect(result).toBe(compactConfigFixture)
  })

  it('should append to a compact single-line array (formatting variant)', () => {
    const result = applyOpsToText(compactConfigFixture, [addLenis])

    expect(result).toContain('lenis')
    expect(result).toContain('gsap')
    expect(result).toContain('three')
  })
})

// ---------------------------------------------------------------------------
// addArrayObjectElement
// ---------------------------------------------------------------------------

describe('addArrayObjectElement', () => {
  const addSanityPattern: AstOperation = {
    kind: 'addArrayObjectElement',
    variableName: 'nextConfig',
    propertyPath: 'images.remotePatterns',
    objectText: "{ protocol: 'https', hostname: 'cdn.sanity.io' }",
    matchProperty: { name: 'hostname', value: 'cdn.sanity.io' },
  }

  it('should append the object when no element matches', () => {
    const result = applyOpsToText(nextConfigFixture, [addSanityPattern])

    expect(result).toContain('cdn.sanity.io')
    expect(count(result, 'cdn.sanity.io')).toBe(1)
    // Existing element survives.
    expect(result).toContain('cdn.shopify.com')
    // Adding twice is a no-op.
    expect(applyOpsToText(result, [addSanityPattern])).toBe(result)
  })

  it('should be an exact no-op when a matching element is present', () => {
    const result = applyOpsToText(nextConfigFixture, [
      {
        kind: 'addArrayObjectElement',
        variableName: 'nextConfig',
        propertyPath: 'images.remotePatterns',
        objectText: "{ protocol: 'https', hostname: 'cdn.shopify.com' }",
        matchProperty: { name: 'hostname', value: 'cdn.shopify.com' },
      },
    ])
    expect(result).toBe(nextConfigFixture)
  })

  it('should normalize quoted keys (exact no-op on compact quoted-key source)', () => {
    const result = applyOpsToText(compactConfigFixture, [
      {
        kind: 'addArrayObjectElement',
        variableName: 'nextConfig',
        propertyPath: 'images.remotePatterns',
        objectText: "{ protocol: 'https', hostname: 'cdn.shopify.com' }",
        matchProperty: { name: 'hostname', value: 'cdn.shopify.com' },
      },
    ])
    expect(result).toBe(compactConfigFixture)
  })

  it('should append to a compact single-line array (formatting variant)', () => {
    const result = applyOpsToText(compactConfigFixture, [addSanityPattern])

    expect(result).toContain('cdn.sanity.io')
    expect(result).toContain('cdn.shopify.com')
  })
})

// ---------------------------------------------------------------------------
// addVariableStatement
// ---------------------------------------------------------------------------

describe('addVariableStatement', () => {
  const lazyCanvasStatement =
    "const LazyWebGLCanvas = dynamic(() => import('@/webgl/components/canvas').then((m) => m.Canvas))"

  const addLazyCanvas: AstOperation = {
    kind: 'addVariableStatement',
    name: 'LazyWebGLCanvas',
    text: lazyCanvasStatement,
  }

  const featuresFixture = `'use client'

import dynamic from 'next/dynamic'

export function OptionalFeatures() {
  return null
}
`

  it('should insert after the last import when absent', () => {
    const result = applyOpsToText(featuresFixture, [addLazyCanvas])

    expect(result).toContain('const LazyWebGLCanvas')
    // Placement: after the import, before the function.
    expect(result.indexOf("'next/dynamic'")).toBeLessThan(
      result.indexOf('const LazyWebGLCanvas')
    )
    expect(result.indexOf('const LazyWebGLCanvas')).toBeLessThan(
      result.indexOf('export function OptionalFeatures')
    )
    // Adding twice is a no-op.
    expect(applyOpsToText(result, [addLazyCanvas])).toBe(result)
  })

  it('should be an exact no-op when the variable exists at top level', () => {
    const fixture = `import dynamic from 'next/dynamic'

const LazyWebGLCanvas = dynamic(() => import('@/webgl/components/canvas'))

export function OptionalFeatures() {
  return null
}
`
    expect(applyOpsToText(fixture, [addLazyCanvas])).toBe(fixture)
  })

  it('should be an exact no-op when the variable exists in function scope (descendant scan)', () => {
    const fixture = `export function OptionalFeatures() {
  const LazyWebGLCanvas = null
  return LazyWebGLCanvas
}
`
    expect(applyOpsToText(fixture, [addLazyCanvas])).toBe(fixture)
  })

  it('should append at the end of the file when afterImports is false', () => {
    const result = applyOpsToText(featuresFixture, [
      { ...addLazyCanvas, afterImports: false },
    ])

    expect(result).toContain('const LazyWebGLCanvas')
    expect(result.indexOf('export function OptionalFeatures')).toBeLessThan(
      result.indexOf('const LazyWebGLCanvas')
    )
  })
})

// ---------------------------------------------------------------------------
// addJsxChild
// ---------------------------------------------------------------------------

describe('addJsxChild', () => {
  const addCanvasChild: AstOperation = {
    kind: 'addJsxChild',
    parentTagName: 'div',
    childText: '<Canvas root />',
    childTagName: 'Canvas',
  }

  it('should append as the last child, matching sibling indentation', () => {
    const fixture = `export function Wrapper({ children }) {
  return (
    <div>
      <main>{children}</main>
    </div>
  )
}
`
    const result = applyOpsToText(fixture, [addCanvasChild])

    expect(result).toContain(
      '      <main>{children}</main>\n      <Canvas root />\n    </div>'
    )
    // Adding twice is a no-op.
    expect(applyOpsToText(result, [addCanvasChild])).toBe(result)
  })

  it('should be an exact no-op when the child tag exists anywhere in the file', () => {
    const fixture = `export function Wrapper({ children }) {
  return (
    <div>
      <Canvas root />
      <main>{children}</main>
    </div>
  )
}
`
    expect(applyOpsToText(fixture, [addCanvasChild])).toBe(fixture)
  })

  it('should insert inline before the closing tag of a single-line parent (formatting variant)', () => {
    const fixture = `export function Wrapper({ children }) {
  return <div><main>{children}</main></div>
}
`
    const result = applyOpsToText(fixture, [addCanvasChild])

    expect(result).toContain('<main>{children}</main><Canvas root /></div>')
  })

  it('should indent one level past the closing tag when the parent has no element children', () => {
    const fixture = `export function App() {
  return (
    <Layout>
    </Layout>
  )
}
`
    const result = applyOpsToText(fixture, [
      {
        kind: 'addJsxChild',
        parentTagName: 'Layout',
        childText: '<Canvas root />',
        childTagName: 'Canvas',
      },
    ])

    expect(result).toContain(
      '    <Layout>\n      <Canvas root />\n    </Layout>'
    )
  })
})

// ---------------------------------------------------------------------------
// addJsxChild — fragment parents and attribute-narrowed idempotency
// ---------------------------------------------------------------------------

describe('addJsxChild (fragment parent)', () => {
  const fragmentFixture = `export function OptionalFeatures() {
  return (
    <>
      <GSAPRuntime />
      {isDevelopment && <OrchestraTools />}
    </>
  )
}
`

  const addLazyCanvas: AstOperation = {
    kind: 'addJsxChild',
    parentTagName: 'Fragment',
    childText: '<LazyWebGLCanvas />',
    childTagName: 'LazyWebGLCanvas',
  }

  it("targets the first JSX fragment when parentTagName is 'Fragment'", () => {
    const result = applyOpsToText(fragmentFixture, [addLazyCanvas])

    expect(result).toContain('<LazyWebGLCanvas />')
    // Appended as the last fragment child, before the closing `</>`.
    expect(result.indexOf('<OrchestraTools />')).toBeLessThan(
      result.indexOf('<LazyWebGLCanvas />')
    )
    expect(result.indexOf('<LazyWebGLCanvas />')).toBeLessThan(
      result.indexOf('</>')
    )
    // Adding twice is a no-op.
    expect(applyOpsToText(result, [addLazyCanvas])).toBe(result)
  })

  it('inserts a JSX expression child into a fragment', () => {
    const fixture = `export function OrchestraTools() {
  return (
    <>
      <Cmdo />
      {stats && <Stats />}
    </>
  )
}
`
    const op: AstOperation = {
      kind: 'addJsxChild',
      parentTagName: 'Fragment',
      childText: '{studio && <Studio />}',
      childTagName: 'Studio',
    }
    const result = applyOpsToText(fixture, [op])

    expect(result).toContain('{studio && <Studio />}')
    expect(result.indexOf('{stats && <Stats />}')).toBeLessThan(
      result.indexOf('{studio && <Studio />}')
    )
    // Adding twice is a no-op (the <Studio /> element now exists).
    expect(applyOpsToText(result, [op])).toBe(result)
  })

  it('is a no-op when the file has no fragment and no matching element', () => {
    const fixture = `export function Thing() {
  return <div>content</div>
}
`
    expect(applyOpsToText(fixture, [addLazyCanvas])).toBe(fixture)
  })
})

describe('addJsxChild (childAttribute disambiguation + sibling-aware parent)', () => {
  const togglesFixture = `export function Cmdo() {
  return (
    <div id="orchestra">
      <Backdrop />
      <div className="row">
        <OrchestraToggle id="grid">G</OrchestraToggle>
        <OrchestraToggle id="stats">S</OrchestraToggle>
      </div>
    </div>
  )
}
`

  const addWebglToggle: AstOperation = {
    kind: 'addJsxChild',
    parentTagName: 'div',
    childText: '<OrchestraToggle id="webgl">W</OrchestraToggle>',
    childTagName: 'OrchestraToggle',
    childAttribute: { name: 'id', value: 'webgl' },
  }

  it('inserts next to same-tag siblings (not into the first tag match)', () => {
    const result = applyOpsToText(togglesFixture, [addWebglToggle])

    expect(result).toContain('id="webgl"')
    // Placed after the existing toggles…
    expect(result.indexOf('id="stats"')).toBeLessThan(
      result.indexOf('id="webgl"')
    )
    // …and inside the inner row div (before its closing tag), not appended
    // to the outer `<div id="orchestra">`.
    expect(result.indexOf('id="webgl"')).toBeLessThan(result.indexOf('</div>'))
    // Adding twice is a no-op.
    expect(applyOpsToText(result, [addWebglToggle])).toBe(result)
  })

  it('same-tag siblings with different attributes do not block insertion', () => {
    // Without childAttribute the existing OrchestraToggles would no-op the
    // add; with it, only an id="webgl" match blocks.
    const result = applyOpsToText(togglesFixture, [addWebglToggle])
    expect(count(result, '<OrchestraToggle')).toBe(3)
  })

  it('is an exact no-op when the matching attribute already exists', () => {
    const blocked = applyOpsToText(togglesFixture, [
      {
        kind: 'addJsxChild',
        parentTagName: 'div',
        childText: '<OrchestraToggle id="grid">G</OrchestraToggle>',
        childTagName: 'OrchestraToggle',
        childAttribute: { name: 'id', value: 'grid' },
      },
    ])
    expect(blocked).toBe(togglesFixture)
  })
})

// ---------------------------------------------------------------------------
// Round trips — remove + add (and vice versa) on a realistic
// next.config-shaped fixture leave the construct present exactly once.
// ---------------------------------------------------------------------------

describe('Round Trips (remove + add)', () => {
  const nextConfigRealistic = `import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      '@react-three/drei',
      '@react-three/fiber',
      'gsap',
      'three',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
  },
}

export default nextConfig
`

  it('remove then add string element leaves the value present exactly once', () => {
    const result = applyOpsToText(nextConfigRealistic, [
      {
        kind: 'removeArrayStringElement',
        variableName: 'nextConfig',
        propertyPath: 'experimental.optimizePackageImports',
        value: 'gsap',
      },
      {
        kind: 'addArrayStringElement',
        variableName: 'nextConfig',
        propertyPath: 'experimental.optimizePackageImports',
        value: 'gsap',
      },
    ])

    expect(count(result, "'gsap'")).toBe(1)
    // Untouched entries are unaffected.
    expect(count(result, "'three'")).toBe(1)
    expect(count(result, '@react-three/drei')).toBe(1)
  })

  it('add then remove string element leaves the original array intact', () => {
    const result = applyOpsToText(nextConfigRealistic, [
      {
        kind: 'addArrayStringElement',
        variableName: 'nextConfig',
        propertyPath: 'experimental.optimizePackageImports',
        value: 'lenis',
      },
      {
        kind: 'removeArrayStringElement',
        variableName: 'nextConfig',
        propertyPath: 'experimental.optimizePackageImports',
        value: 'lenis',
      },
    ])

    expect(result).not.toContain('lenis')
    expect(count(result, "'gsap'")).toBe(1)
    expect(count(result, "'three'")).toBe(1)
    expect(count(result, '@react-three/drei')).toBe(1)
    expect(count(result, '@react-three/fiber')).toBe(1)
  })

  it('remove then add object element leaves the element present exactly once', () => {
    const result = applyOpsToText(nextConfigRealistic, [
      {
        kind: 'removeArrayObjectElement',
        variableName: 'nextConfig',
        propertyPath: 'images.remotePatterns',
        matchProperty: { name: 'hostname', value: 'cdn.sanity.io' },
      },
      {
        kind: 'addArrayObjectElement',
        variableName: 'nextConfig',
        propertyPath: 'images.remotePatterns',
        objectText: "{ protocol: 'https', hostname: 'cdn.sanity.io' }",
        matchProperty: { name: 'hostname', value: 'cdn.sanity.io' },
      },
    ])

    expect(count(result, 'cdn.sanity.io')).toBe(1)
    expect(count(result, 'cdn.shopify.com')).toBe(1)
  })

  it('add then remove object element leaves the original patterns intact', () => {
    const result = applyOpsToText(nextConfigRealistic, [
      {
        kind: 'addArrayObjectElement',
        variableName: 'nextConfig',
        propertyPath: 'images.remotePatterns',
        objectText: "{ protocol: 'https', hostname: 'images.ctfassets.net' }",
        matchProperty: { name: 'hostname', value: 'images.ctfassets.net' },
      },
      {
        kind: 'removeArrayObjectElement',
        variableName: 'nextConfig',
        propertyPath: 'images.remotePatterns',
        matchProperty: { name: 'hostname', value: 'images.ctfassets.net' },
      },
    ])

    expect(result).not.toContain('images.ctfassets.net')
    expect(count(result, 'cdn.shopify.com')).toBe(1)
    expect(count(result, 'cdn.sanity.io')).toBe(1)
  })

  it('remove then add import leaves the declaration present exactly once', () => {
    const result = applyOpsToText(nextConfigRealistic, [
      { kind: 'removeImport', specifier: 'next' },
      {
        kind: 'addImport',
        text: "import type { NextConfig } from 'next'",
      },
    ])

    expect(count(result, "from 'next'")).toBe(1)
    expect(result).toContain('NextConfig')
  })
})
