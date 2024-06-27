'use client'

import {
  useFrame,
  useIntersectionObserver,
  useResizeObserver,
} from '@darkroom.engineering/hamo'
import cn from 'clsx'
import modulo from 'just-modulo'
import { useLenis } from 'libs/lenis'
import { useRef } from 'react'
import s from './marquee.module.scss'

export function Marquee({
  children,
  repeat = 2,
  className,
  speed = 0.1,
  reversed,
  pauseOnHover = false,
  ...props
}) {
  const [setRectRef, { contentRect: rect }] = useResizeObserver()
  const elementsRef = useRef([])
  const transformRef = useRef(Math.random() * 1000)
  const isHovered = useRef(false)

  const [setIntersectionRef, intersection] = useIntersectionObserver()

  const lenis = useLenis() // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, deltaTime) => {
    if (!intersection.isIntersecting) return
    if (pauseOnHover && isHovered.current) return

    if (!rect.width) return

    const adjSpeed = speed * (1 + Math.abs(lenis.velocity / 5))

    if (reversed) {
      transformRef.current -= deltaTime * adjSpeed
    } else {
      transformRef.current += deltaTime * adjSpeed
    }

    transformRef.current = modulo(transformRef.current, rect.width)

    elementsRef.current.forEach((node) => {
      node.style.transform = `translate3d(${-transformRef.current}px,0,0)`
    })
  })

  return (
    <div
      ref={setIntersectionRef}
      className={cn(className, s.marquee)}
      {...props}
      onMouseEnter={() => {
        isHovered.current = true
      }}
      onMouseLeave={() => {
        isHovered.current = false
      }}
    >
      {new Array(repeat).fill(children).map((_, i) => (
        <div
          key={i}
          className={s.inner}
          aria-hidden={i !== 0 ?? undefined}
          data-nosnippet={i !== 0 ? '' : undefined}
          ref={(node) => {
            elementsRef.current[i] = node

            if (i === 0) setRectRef(node)
          }}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
