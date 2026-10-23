'use client'

import {
  TransformProvider,
  type TransformRef,
  useRect,
  useScrollTrigger,
} from 'hamo'
import { type PropsWithChildren, useRef } from 'react'

interface ParallaxProps extends PropsWithChildren {
  className?: string | undefined
  /** Travel in CSS pixels while the wrapper crosses the viewport, half before the middle, half after. Negative reverses. */
  distance?: number
}

/**
 * Moves what it wraps with the scroll, in the DOM and in the canvas at once.
 *
 * The same translate goes to the wrapper's CSS and to hamo's
 * `TransformProvider`; `useWebGLRect` adds it to each WebGL element's resting
 * rect, which is measured ignoring transforms so the offset counts once. Both
 * writes happen in the scroll callback, which Tempus runs before the canvas
 * draws, so box and cube move in the same frame.
 *
 * The trigger's rect ignores transforms too: measured through the transform,
 * it would move its own start and end.
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
