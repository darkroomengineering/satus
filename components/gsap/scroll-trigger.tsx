'use client'

import gsap from 'gsap'
import { ScrollTrigger as GSAPScrollTrigger } from 'gsap/all'
import { useLenis } from 'lenis/react'
import { useEffect, useEffectEvent } from 'react'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(GSAPScrollTrigger)
  GSAPScrollTrigger.clearScrollMemory('manual')
  GSAPScrollTrigger.defaults({
    markers: process.env.NODE_ENV === 'development',
  })
}

export function ScrollTrigger() {
  const handleUpdate = useEffectEvent(() => {
    GSAPScrollTrigger.update()
  })

  const handleRefresh = useEffectEvent(() => {
    GSAPScrollTrigger.refresh()
  })

  const lenis = useLenis(handleUpdate)

  // biome-ignore lint/correctness/useExhaustiveDependencies: handleRefresh is useEffectEvent
  useEffect(() => {
    if (lenis) {
      handleRefresh()
    }
  }, [lenis])

  return null
}
