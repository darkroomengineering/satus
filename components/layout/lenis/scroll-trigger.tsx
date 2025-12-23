import gsap from 'gsap'
import { ScrollTrigger as GSAPScrollTrigger } from 'gsap/all'
import { useLenis } from 'lenis/react'
import { useEffect, useEffectEvent } from 'react'

// Register ScrollTrigger once
if (typeof window !== 'undefined') {
  gsap.registerPlugin(GSAPScrollTrigger)
  //   GSAPScrollTrigger.clearScrollMemory('manual')
  //   GSAPScrollTrigger.defaults({
  //     markers: process.env.NODE_ENV === 'development',
  //   })
}

/**
 * Syncs GSAP ScrollTrigger with Lenis scroll position.
 * Must be rendered inside ReactLenis context.
 */
export function LenisScrollTriggerSync() {
  useEffect(() => {
    GSAPScrollTrigger.update()
  }, [])

  const handleUpdate = useEffectEvent(() => {
    GSAPScrollTrigger.update()
  })

  const handleRefresh = useEffectEvent(() => {
    GSAPScrollTrigger.refresh()
  })

  const lenis = useLenis(handleUpdate)

  useEffect(() => {
    if (lenis) {
      handleRefresh()
    }
  }, [lenis])

  return null
}
