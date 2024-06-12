'use client'

import { gsap } from 'gsap'
import { useHashState } from 'hooks/use-hash'
import { useEffect, useRef } from 'react'

export function PageTransition({ children }) {
  const [hash] = useHashState()
  const containerRef = useRef(null)

  useEffect(() => {
    const animateIn = () => {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, x: '100%' },
        { opacity: 1, x: 0, duration: 0.5 },
      )
    }

    const animateOut = (callback) => {
      gsap.to(containerRef.current, {
        opacity: 0,
        x: '100%',
        duration: 0.5,
        onComplete: callback,
      })
    }

    animateIn()

    return () => {
      animateOut(() => {})
    }
  }, [hash])

  return <div ref={containerRef}>{children}</div>
}
