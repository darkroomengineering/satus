'use client'

import cn from 'clsx'
import { useIntersectionObserver, useResizeObserver } from 'hamo'
import { useLenis } from 'lenis/react'
import { type HTMLAttributes, useRef } from 'react'
import { useTempus } from 'tempus/react'
import { modulo } from '~/libs/utils'
import s from './marquee.module.css'

interface MarqueeProps extends HTMLAttributes<HTMLElement> {
  repeat?: number
  speed?: number
  scrollVelocity?: boolean
  reversed?: boolean
  pauseOnHover?: boolean
}

export function Marquee({
  children,
  className,
  repeat = 2,
  speed = 1,
  scrollVelocity = true,
  reversed = false,
  pauseOnHover = false,
  onMouseEnter,
  onMouseLeave,
  ...props
}: MarqueeProps) {
  const [setRectRef, getEntry] = useResizeObserver({
    lazy: true,
  })

  // return
  const elementsRef = useRef<HTMLDivElement[]>([])
  const transformRef = useRef(Math.random() * 1000)
  const isHovered = useRef(false)

  const [setIntersectionRef, intersection] = useIntersectionObserver()

  const lenis = useLenis()

  useTempus((_, deltaTime) => {
    const entry = getEntry()

    if (!intersection.isIntersecting) return
    if (pauseOnHover && isHovered.current) return

    if (!entry?.borderBoxSize[0]?.inlineSize) return

    let velocity = lenis?.velocity ?? 0
    if (!scrollVelocity) {
      velocity = 0
    }
    velocity = 1 + Math.abs(velocity / 5)

    const offset = deltaTime * (speed * 0.1 * velocity)

    if (reversed) {
      transformRef.current -= offset
    } else {
      transformRef.current += offset
    }

    const width = entry.borderBoxSize[0].inlineSize
    transformRef.current = modulo(transformRef.current, width)

    for (const node of elementsRef.current) {
      node.style.transform = `translate3d(${-transformRef.current}px,0,0)`
    }
  })

  return (
    <section
      ref={setIntersectionRef}
      className={cn(className, s.marquee)}
      aria-live="off"
      aria-label="Scrolling content"
      onMouseEnter={(e) => {
        isHovered.current = true
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        isHovered.current = false
        onMouseLeave?.(e)
      }}
      {...props}
    >
      {new Array(repeat).fill(children).map((_, i) => (
        <div
          key={`marquee-item-${
            // biome-ignore lint/suspicious/noArrayIndexKey: i can't come up with anything better tbh
            i
          }`}
          className={s.inner}
          aria-hidden={i !== 0}
          data-nosnippet={i !== 0 ? '' : undefined}
          ref={(node) => {
            if (!node) return
            elementsRef.current[i] = node

            if (i === 0) setRectRef(node)
          }}
        >
          {children}
        </div>
      ))}
    </section>
  )
}
