import type { PropsWithChildren } from 'react'

/**
 * Own layout for the machine view, deliberately bypassing the app's normal
 * chrome: no `<Wrapper>`, no header, no footer, no WebGL canvas, and no
 * client components of its own. The page below is server-rendered end to
 * end, so an agent gets the entity and every link in the first byte.
 *
 * It is NOT provider-free, and the distinction matters: this route lives
 * inside the `(site)` group, so it inherits the providers, analytics and RAF
 * loop mounted by `app/(site)/layout.tsx` like every other app route. To make
 * the machine view genuinely runtime-free, move it out of the `(site)` group —
 * the root `app/layout.tsx` is already a bare `<html>`/`<body>` shell. Worth
 * doing on a heavy site; overkill for one that is already light.
 *
 * The Organization/WebSite JSON-LD graph already renders from the app
 * layout (`app/(site)/layout.tsx`) on every page in the group, this one
 * included — do not re-render `organizationSchema()`/`websiteSchema()` here,
 * it would duplicate `@id` nodes in the graph. (If this route ever moves out
 * of `(site)` to shed the runtime, it must start rendering the graph itself.)
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
