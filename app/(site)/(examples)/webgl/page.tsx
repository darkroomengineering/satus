import type { Metadata } from 'next'

import { Wrapper } from '@/components/layout/wrapper'

import { Cube } from './_components/cube'
import { Parallax } from './_components/parallax'

// A worked example for this repo's contributors, not site content. noindex
// here, and `/webgl` sits in `RESERVED_PATHS` (lib/seo/routes.ts) so it never
// reaches the sitemap or the `/ai` view; `setup:project` deletes the whole
// examples group. Same contract as `/sanity`.
export const metadata: Metadata = {
  title: 'WebGL follows CSS',
  robots: { index: false, follow: false },
}

/**
 * A worked example of how WebGL follows the DOM: each cube takes its size
 * and place from a plain box that CSS lays out. The page sizes the boxes
 * two ways on purpose — viewport-scaled `dr-*` widths and a share of their
 * row — and places them by flow, to show any CSS length works. The cube
 * component only knows the box's proportions. Nothing about a cube is
 * positioned in JavaScript. One of the boxes also
 * moves with the scroll: a CSS transform on a wrapper, published to the
 * canvas through hamo's `TransformProvider`, so the cube moves with its
 * box. Scroll and resize: a cube never leaves its box. See
 * `_components/cube` and `_components/parallax`.
 *
 * Where the canvas does not mount (mobile, reduced motion, no WebGL2, and
 * the GPU-less browser the e2e sweep runs in) the dashed boxes stand alone:
 * the layout the cubes follow is the fallback.
 */
export default function WebGLExamplePage() {
  return (
    <Wrapper>
      <section className="grid min-h-svh grid-cols-[1fr_auto] items-center dr-gap-120 dr-px-120 font-mono">
        <div>
          <h1 className="dr-mb-16 font-display dr-text-49 leading-[1.15]">
            WebGL follows CSS
          </h1>
          <p className="dr-max-w-560 dr-text-16 leading-[1.5]">
            Each dashed box is a plain div sized and placed by the stylesheet.
            The cube inside it is drawn in the shared canvas and follows the box
            through scroll and resize. The last box also drifts with the scroll:
            a CSS transform, published to the canvas through a transform
            provider.
          </p>
        </div>
        {/* In the first screen, so the page lands on a cube. */}
        <Cube className="dr-w-300" />
      </section>
      <section className="dr-max-w-880 dr-px-120 dr-pb-120 font-mono dr-text-14 leading-[1.5]">
        <h2 className="dr-mb-16 font-display dr-text-28 leading-[1.15]">
          How the sync is built
        </h2>
        <ol className="grid list-decimal dr-gap-12 dr-pl-20 [&_code]:font-[700]">
          <li>
            One root canvas, mounted one of two ways. Shared, in the layout (
            <code>lib/features</code>, the default here): one context for the
            whole site, kept across navigations, so a transition can carry a
            scene and its loaded assets from page to page. For WebGL-heavy
            sites. Per page, with <code>&lt;Wrapper webgl&gt;</code> once the
            layout&apos;s is removed: three.js and the fiber load only where
            used, for a site that reaches for WebGL now and then. Pick one,
            never both.
          </li>
          <li>
            Either way the fiber&apos;s own loop is off (
            <code>frameloop=&quot;never&quot;</code>). Tempus runs a single rAF:
            Lenis writes the scroll at order -1, the <code>RAF</code> component
            advances the fiber at order 1, so every draw sees this frame&apos;s
            scroll.
          </li>
          <li>
            Each box is a div measured by hamo&apos;s <code>useRect</code>, once
            per resize, ignoring transforms. The rect and the mesh go into the
            canvas through <code>&lt;WebGLTunnel&gt;</code>, which also bridges
            the DOM contexts (transform, Theatre sheet) into the fiber&apos;s
            separate reconciler.
          </li>
          <li>
            In the canvas, <code>useWebGLRect</code> takes that rect and, on
            each Lenis scroll event, provider transform change or re-measure,
            turns it + <code>lenis.scroll</code> + the provider&apos;s translate
            into a position in camera units, one unit per CSS pixel, origin
            mid-screen, and its callback copies that onto the mesh. Lenis emits
            inside its raf, before the canvas draws. Nothing reads layout while
            scrolling, and nothing runs while nothing moves.
          </li>
          <li>
            Parallax: <code>useScrollTrigger</code> maps the wrapper&apos;s
            crossing to a translate, written twice in the same callback: a CSS
            transform on the wrapper and{' '}
            <code>TransformProvider.setTranslate</code>. Every WebGL element
            under the provider adds that translate to its resting rect, so box
            and cube move in the same frame and the offset counts once.
          </li>
          <li>
            Gates: the canvas mounts only on a desktop WebGL2 context, without
            reduced motion, after window load. Otherwise the boxes stand alone:
            the layout is the fallback.
          </li>
          <li>
            Lazy by default: nothing here runs on a clock. Lenis emits only
            while it lerps, hamo re-measures only when an observer fires, the
            provider notifies only on a write, and a mesh is placed the moment
            it mounts. Between those signals an element costs nothing: no frame
            loop, no polling, no work while nothing moves. A new source of
            movement gets a new signal, never a loop.
          </li>
        </ol>
      </section>
      <section className="flex items-end dr-gap-48 dr-p-120">
        <Cube className="dr-w-96" />
        <Cube className="dr-w-220" />
        {/* A share of the row: resizes with it, as a column would. */}
        <Parallax className="w-1/4" distance={240}>
          <Cube />
        </Parallax>
      </section>
    </Wrapper>
  )
}
