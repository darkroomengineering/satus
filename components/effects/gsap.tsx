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
 * import { GSAPRuntime } from '~/components/effects/gsap'
 *
 * <body>
 *   <GSAPRuntime />
 *   {children}
 * </body>
 * ```
 */

import gsap from 'gsap'
import dynamic from 'next/dynamic'
import { useTempus } from 'tempus/react'

if (typeof window !== 'undefined') {
  gsap.defaults({ ease: 'none' })
  gsap.ticker.lagSmoothing(0)
  gsap.ticker.remove(gsap.updateRoot)
}

function GSAP() {
  useTempus((time) => {
    gsap.updateRoot(time / 1000)
  })
  return null
}

const GSAPDynamic = dynamic(() => Promise.resolve(GSAP), { ssr: false })

/**
 * Syncs GSAP ticker with Tempus frame loop.
 * Add to your root layout to enable GSAP animations.
 */
export function GSAPRuntime() {
  return <GSAPDynamic />
}
