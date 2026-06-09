import gsap from 'gsap'
import { ScrollTrigger as GSAPScrollTrigger } from 'gsap/ScrollTrigger'
import { useLenis } from 'lenis/react'
import { useEffect } from 'react'

// Register ScrollTrigger once
if (typeof window !== 'undefined') {
  gsap.registerPlugin(GSAPScrollTrigger)
}

// Stable, non-reactive handlers. They only call GSAP ScrollTrigger statics and
// read no reactive state, so they live at module scope rather than as
// useEffectEvent functions passed into useLenis() — Effect Event functions must
// not be passed to other hooks (rules-of-hooks).
function handleUpdate() {
  GSAPScrollTrigger.update()
}

function handleRefresh() {
  GSAPScrollTrigger.refresh()
}

/**
 * Syncs GSAP ScrollTrigger with Lenis scroll position.
 * Must be rendered inside ReactLenis context.
 */
export function LenisScrollTriggerSync() {
  useEffect(() => {
    GSAPScrollTrigger.update()
  }, [])

  const lenis = useLenis(handleUpdate)

  useEffect(() => {
    if (lenis) {
      handleRefresh()
    }
  }, [lenis])

  return null
}
