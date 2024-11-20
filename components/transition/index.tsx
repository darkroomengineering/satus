'use client'

import { gsap } from 'gsap'
import { TransitionRouter } from 'next-transition-router'
import { useRef } from 'react'
import s from './transition.module.css'

export function Transition({ children }: { children: React.ReactNode }) {
  const layerRef = useRef(null)

  return (
    <TransitionRouter
      auto
      leave={(next) => {
        const tween = gsap.fromTo(
          layerRef.current,
          { y: '100%' },
          {
            duration: 0.8,
            y: 0,
            ease: 'power2.inOut',
            onComplete: next,
          }
        )

        return () => tween.kill()
      }}
      enter={(next) => {
        const tween = gsap.fromTo(
          layerRef.current,
          { y: 0 },
          {
            duration: 0.8,
            y: '-100%',
            ease: 'power2.inOut',
            onComplete: next,
          }
        )

        return () => tween.kill()
      }}
    >
      {children}

      <div ref={layerRef} className={s.layer} />
    </TransitionRouter>
  )
}
