'use client'

import { useRect } from 'hamo'
import dynamic from 'next/dynamic'
import type { ComponentProps, CSSProperties } from 'react'
import { Activity, useEffect, useRef, useState } from 'react'
import { WebGLTunnel } from '~/webgl/components/tunnel'

const WebGLAnimatedGradient = dynamic(
  () =>
    import('./webgl').then(
      ({ WebGLAnimatedGradient }) => WebGLAnimatedGradient
    ),
  {
    ssr: false,
  }
)

const toDOMRect = (
  rect: {
    width?: number
    height?: number
    top?: number
    left?: number
    right?: number
    bottom?: number
    x?: number
    y?: number
  } | null
): DOMRect => ({
  top: rect?.top ?? 0,
  right: rect?.right ?? 0,
  bottom: rect?.bottom ?? 0,
  left: rect?.left ?? 0,
  width: rect?.width ?? 0,
  height: rect?.height ?? 0,
  x: rect?.x ?? 0,
  y: rect?.y ?? 0,
  toJSON: () => ({
    top: rect?.top ?? 0,
    right: rect?.right ?? 0,
    bottom: rect?.bottom ?? 0,
    left: rect?.left ?? 0,
    width: rect?.width ?? 0,
    height: rect?.height ?? 0,
    x: rect?.x ?? 0,
    y: rect?.y ?? 0,
  }),
})

type AnimatedGradientProps = {
  className?: string
  style?: CSSProperties
} & Omit<ComponentProps<typeof WebGLAnimatedGradient>, 'rect'>

export function AnimatedGradient({
  className,
  style,
  ...props
}: AnimatedGradientProps) {
  const [setRectRef, rect] = useRect()
  const [isVisible, setIsVisible] = useState(true)
  const elementRef = useRef<HTMLDivElement | null>(null)

  // Combined ref callback
  const setRefs = (element: HTMLDivElement | null) => {
    setRectRef(element)
    elementRef.current = element
  }

  // Use Intersection Observer to detect viewport visibility
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      {
        rootMargin: '200px', // Pre-activate before visible
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    // Wrap the entire DOM container with Activity
    // This defers rect tracking and tunnel updates when off-screen
    <Activity mode={isVisible ? 'visible' : 'hidden'}>
      <div ref={setRefs} className={className} style={style}>
        {/* WebGLTunnel content renders inside R3F Canvas (no Activity there) */}
        <WebGLTunnel>
          <WebGLAnimatedGradient rect={toDOMRect(rect)} {...props} />
        </WebGLTunnel>
      </div>
    </Activity>
  )
}
