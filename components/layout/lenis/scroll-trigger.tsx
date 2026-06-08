import gsap from 'gsap'
import { ScrollTrigger as GSAPScrollTrigger } from 'gsap/ScrollTrigger'
import { useLenis } from 'lenis/react'
import { useEffect } from 'react'

// Register ScrollTrigger once
if (typeof window !== 'undefined') {
  gsap.registerPlugin(GSAPScrollTrigger)
  //   GSAPScrollTrigger.clearScrollMemory('manual')
  //   GSAPScrollTrigger.defaults({
  //     markers: process.env.NODE_ENV === 'development',
  //   })
}

// Stable, non-reactive handlers. They only call GSAP ScrollTrigger statics, so
// they belong at module scope. They were previously useEffectEvent functions
// passed into useLenis() — but Effect Event functions must not be passed to
// other hooks (rules-of-hooks), and these read no reactive state anyway.
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
