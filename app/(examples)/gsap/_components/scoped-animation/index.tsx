'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'

import s from './scoped-animation.module.css'

const CARDS = ['one', 'two', 'three', 'four']

/**
 * Demonstrates the three things `useGSAP` gives you over a bare `useEffect`.
 *
 * 1. Selector strings resolve against `scope`, so `.card` only matches inside
 *    this component. The control card below sits outside the scope with the
 *    same class and must never move.
 * 2. Everything created inside the hook is reverted on unmount, so navigating
 *    away leaves no live tweens behind.
 * 3. `contextSafe` pulls animations started from an event handler back into
 *    that same cleanup — without it they outlive the component.
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
      <div className={s.scope} ref={scope} data-testid="scope">
        {CARDS.map((label) => (
          <div className={`card ${s.card}`} key={label}>
            {label}
          </div>
        ))}
      </div>

      <button className={s.button} onClick={nudge} type="button">
        nudge (contextSafe)
      </button>

      {/* Outside the scope, same class. If this ever moves, scoping broke. */}
      <div className={`card ${s.control}`} data-testid="control">
        control — outside scope
      </div>
    </div>
  )
}
