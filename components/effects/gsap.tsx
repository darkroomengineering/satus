'use client'

/**
 * GSAP Runtime
 *
 * Syncs GSAP's ticker with Tempus for consistent frame timing.
 * ScrollTrigger sync is handled automatically by `<Lenis root />`.
 *
 * @example
 * ```tsx
 * // app/(site)/layout.tsx
 * import { GSAPRuntime } from '@/components/effects/gsap'
 *
 * <body>
 *   <GSAPRuntime />
 *   {children}
 * </body>
 * ```
 *
 * To write an animation in a component, use `useGSAP` from `@gsap/react`
 * rather than a bare `useEffect`. It scopes selector strings to a ref and
 * reverts every tween, timeline, and ScrollTrigger created inside it on
 * unmount, so there is no cleanup to forget:
 *
 * ```tsx
 * 'use client'
 * import { useGSAP } from '@gsap/react'
 * import gsap from 'gsap'
 * import { useRef } from 'react'
 *
 * export function Section() {
 *   const ref = useRef<HTMLDivElement>(null)
 *
 *   useGSAP(
 *     () => {
 *       // '.card' only matches inside `ref`
 *       gsap.to('.card', { y: 0, opacity: 1, stagger: 0.1 })
 *     },
 *     { scope: ref }
 *   )
 *
 *   return <div ref={ref}>…</div>
 * }
 * ```
 *
 * Animations started from an event handler run outside the hook's scope, so
 * wrap them in `contextSafe` to keep them under the same cleanup:
 *
 * ```tsx
 * const { contextSafe } = useGSAP({ scope: ref })
 * const onClick = contextSafe(() => gsap.to('.card', { x: 100 }))
 * ```
 *
 * Reduced motion is not handled for you here. Gate motion with
 * `gsap.matchMedia()` on `(prefers-reduced-motion: reduce)` so elements still
 * reach their final state rather than being stranded mid-animation.
 */

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect } from 'react'
import { useTempus } from 'tempus/react'

// `useGSAP` declares itself headless, so it registers in either environment —
// unlike the ticker config below, which touches browser-only APIs. Registering
// is what GSAP's React guide prescribes: it binds the hook to this copy of the
// core and keeps it from being tree-shaken. It only manages animation
// lifecycle, so it leaves the Tempus-driven ticker alone. Plugins a single
// component consumes (SplitText, ScrollTrigger) register in that component's
// module instead — registering them here would ship their weight on every
// page. See `components/effects/progress-text` for the canonical
// useGSAP + SplitText usage.
gsap.registerPlugin(useGSAP)

// oxlint-disable-next-line anti-slop/no-runtime-typeof -- SSR guard; literal typeof enables bundler dead-code elimination
if (typeof window !== 'undefined') {
  gsap.defaults({ ease: 'none' })
}

/**
 * Syncs GSAP ticker with Tempus frame loop.
 *
 * Importing this module pulls in the GSAP core (~43KB gzipped), so it is
 * mounted only when a layout opts in — see `OptionalFeatures`' `gsap` prop.
 * A page that never animates ships none of it.
 */
export function GSAPRuntime() {
  // Tempus owns the frame loop, so GSAP's own rAF ticker must not advance the
  // root clock at the same time. Paired here rather than at module scope: the
  // handover is only correct while this component is mounted, and unmounting
  // without giving the ticker back would freeze every in-flight tween.
  useEffect(() => {
    gsap.ticker.lagSmoothing(0)
    gsap.ticker.remove(gsap.updateRoot)

    return () => {
      gsap.ticker.add(gsap.updateRoot)
    }
  }, [])

  // order: 10 — after Lenis (order: 5) has written scroll state, so scrubbed
  // ScrollTrigger tweens render this frame's scroll position, not last frame's.
  useTempus(
    ({ time }) => {
      gsap.updateRoot(time / 1000)
    },
    { order: 10 }
  )

  return null
}
