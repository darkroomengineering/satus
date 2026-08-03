'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'

import s from './scoped-animation.module.css'

const CARDS = ['one', 'two', 'three', 'four']

/**
 * Scoped GSAP animation.
 *
 * `useGSAP` resolves selector strings against `scope`, so `.card` matches only
 * inside this component, and reverts every tween it creates on unmount.
 * Animations started from an event handler run outside that scope unless you
 * wrap them in `contextSafe`, as `nudge` does below.
 */
export function ScopedAnimation() {
  const scope = useRef<HTMLDivElement>(null)

  const { contextSafe } = useGSAP(
    () => {
      gsap.from('.card', {
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power2.out',
      })
    },
    { scope }
  )

  const nudge = contextSafe(() => {
    gsap.to('.card', {
      x: 'random(-24, 24)',
      rotation: 'random(-8, 8)',
      duration: 0.4,
      stagger: 0.04,
      ease: 'power2.inOut',
    })
  })

  return (
    <div className={s.root}>
      <div className={s.scope} ref={scope}>
        {CARDS.map((label) => (
          <div className={`card ${s.card}`} key={label}>
            {label}
          </div>
        ))}
      </div>

      <button className={s.button} onClick={nudge} type="button">
        nudge
      </button>
    </div>
  )
}
