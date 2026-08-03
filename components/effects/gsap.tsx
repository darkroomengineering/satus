'use client'

/**
 * GSAP Runtime
 *
 * Syncs GSAP's ticker with Tempus for consistent frame timing.
 * ScrollTrigger sync is handled automatically by `<Lenis root />`.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
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
import { useTempus } from 'tempus/react'

// `useGSAP` declares itself headless, so it registers in either environment —
// unlike the ticker config below, which touches browser-only APIs. Registering
// is what GSAP's React guide prescribes: it binds the hook to this copy of the
// core and keeps it from being tree-shaken. It only manages animation
// lifecycle, so it leaves the Tempus-driven ticker alone.
gsap.registerPlugin(useGSAP)

if (typeof window !== 'undefined') {
  gsap.defaults({ ease: 'none' })
  gsap.ticker.lagSmoothing(0)
  gsap.ticker.remove(gsap.updateRoot)
}

/**
 * Syncs GSAP ticker with Tempus frame loop.
 * Add to your root layout to enable GSAP animations.
 */
export function GSAPRuntime() {
  useTempus(({ time }) => {
    gsap.updateRoot(time / 1000)
  })

  return null
}
