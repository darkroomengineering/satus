'use client'

import dynamic from 'next/dynamic'

// Split GSAP runtimes out of the main bundle and ensure client-only execution
const GSAP = dynamic(() => import('./index').then((m) => m.GSAP), {
  ssr: false,
})

const ScrollTrigger = dynamic(
  () => import('./scroll-trigger').then((m) => m.ScrollTrigger),
  { ssr: false }
)

export function GSAPRuntime() {
  return (
    <>
      <GSAP />
      <ScrollTrigger />
    </>
  )
}
