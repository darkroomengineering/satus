'use client'

import dynamic from 'next/dynamic'
import { useLayoutEffect } from 'react'
import Tempus from 'tempus'

const ScrollTriggerConfig = dynamic(
  () => import('./scroll-trigger').then((mod) => mod.ScrollTriggerConfig),
  { ssr: false }
)

// Lazy load GSAP
let gsapInstance: typeof import('gsap').default | null = null

async function loadGSAP() {
  if (!gsapInstance) {
    const gsapModule = await import('gsap')
    gsapInstance = gsapModule.default
  }
  return gsapInstance
}

export function GSAP({ scrollTrigger = false }) {
  useLayoutEffect(() => {
    loadGSAP().then((gsap) => {
      gsap.defaults({ ease: 'none' })

      // merge rafs
      gsap.ticker.lagSmoothing(0)
      gsap.ticker.remove(gsap.updateRoot)
      Tempus?.add((time: number) => {
        gsap.updateRoot(time / 1000)
      })
    })
  }, [])

  return scrollTrigger ? <ScrollTriggerConfig /> : null
}
