import type { PropsWithChildren } from 'react'

/**
 * Own layout for the machine view, deliberately bypassing the app's normal
 * chrome: no `<Wrapper>`, no header, no footer, no WebGL canvas, and no
 * client components of its own. The page below is server-rendered end to
 * end, so an agent gets the entity and every link in the first byte.
 *
 * It is NOT provider-free, and the distinction matters: Satus keeps its
 * providers, analytics and RAF loop in the ROOT layout, so `/ai` inherits
 * them like every other route. To make the machine view genuinely
 * runtime-free, move that runtime into a `(site)` route group layout and
 * leave `app/layout.tsx` holding only `<html>`/`<body>` and the JSON-LD.
 * Worth doing on a heavy site; overkill for one that is already light.
 *
 * The Organization/WebSite JSON-LD graph already renders from the ROOT
 * layout (`app/layout.tsx`) on every page, this one included. Unlike a site
 * that scopes its schema to a `(site)` route group, Satus's root layout
 * gives this route the entity graph for free — do not re-render
 * `organizationSchema()`/`websiteSchema()` here, it would duplicate `@id`
 * nodes in the graph.
 *
 * `font-mono` resolves to the project's configured mono font
 * (`--next-font-mono` / Spline Sans Mono, see `lib/styles/fonts.ts`), not
 * the Tailwind default system stack.
 */
export default function AiLayout({ children }: PropsWithChildren) {
  return (
    <div className="max-w-3xl px-6 py-16 text-sm leading-relaxed mx-auto min-h-dvh font-mono">
      {/* Matches the skip-link target in the root layout — this route
          bypasses <Wrapper>, which is what normally provides the id. */}
      <main id="main-content">{children}</main>
    </div>
  )
}
