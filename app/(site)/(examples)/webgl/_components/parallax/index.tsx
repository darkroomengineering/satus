'use client'

import {
  type TransformRef,
  TransformProvider,
  useRect,
  useScrollTrigger,
} from 'hamo'
import { type PropsWithChildren, useRef } from 'react'

interface ParallaxProps extends PropsWithChildren {
  /** Sizes and places the wrapper; what it wraps fills it. */
  className?: string | undefined
  /**
   * How far the content travels while the wrapper crosses the viewport, in
   * CSS pixels: half of it before the middle, half after. Negative travels
   * the other way.
   */
  distance?: number
}

/**
 * Moves what it wraps with the scroll, in the DOM and in the canvas at once.
 *
 * The wrapper gets a CSS translate as it crosses the viewport, as any
 * parallax would. What keeps a cube inside it in step is the second write:
 * the same translate goes to hamo's `TransformProvider`, and `useWebGLRect`
 * in every WebGL element under it adds the provider's translate to the
 * element's resting rect. That rect is measured ignoring transforms, so the
 * offset is counted exactly once. Both writes happen in the scroll
 * callback, which Tempus runs before the canvas draws, so the box and the
 * cube move in the same frame.
 *
 * The trigger reads the wrapper's rect ignoring transforms too. Measured
 * through the transform, it would move its own start and end as it went.
 */
export function Parallax({
  className,
  distance = 240,
  children,
}: ParallaxProps) {
  const transformRef = useRef<TransformRef>(null)
  const elementRef = useRef<HTMLDivElement>(null)
  const [setRectRef, rect] = useRect({ ignoreTransform: true })

  useScrollTrigger({
    rect,
    start: 'top bottom',
    end: 'bottom top',
    onProgress: ({ progress }) => {
      // Centred on the crossing: mid-screen, the content sits where CSS
      // put it.
      const y = (0.5 - progress) * distance
      if (elementRef.current) {
        elementRef.current.style.transform = `translate3d(0, ${y}px, 0)`
      }
      transformRef.current?.setTranslate(0, y)
    },
  })

  return (
    <TransformProvider ref={transformRef}>
      <div
        ref={(element) => {
          elementRef.current = element
          setRectRef(element)
        }}
        className={className}
      >
        {children}
      </div>
    </TransformProvider>
  )
}
