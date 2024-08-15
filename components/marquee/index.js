'use client'

import {
  useFrame,
  useIntersectionObserver,
  useResizeObserver,
} from '@darkroom.engineering/hamo'
import cn from 'clsx'
import { useLenis } from 'libs/lenis'
import { modulo } from 'libs/maths'
import PropTypes from 'prop-types'
import { useRef } from 'react'
import s from './marquee.module.scss'

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

    transformRef.current = modulo(transformRef.current, rect.width)

    elementsRef.current.forEach((node) => {
      node.style.transform = `translate3d(${-transformRef.current}px,0,0)`
    })
  })

  return (
    <div
      ref={setIntersectionRef}
      className={cn(className, s.marquee)}
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

Marquee.propTypes = {
  repeat: PropTypes.number,
  speed: PropTypes.number,
  scrollVelocity: PropTypes.bool,
  reversed: PropTypes.bool,
  pauseOnHover: PropTypes.bool,
}
