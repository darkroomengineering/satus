'use client'

import { useRect } from 'hamo'
import dynamic from 'next/dynamic'
import { Activity, useEffect, useRef, useState } from 'react'
import { WebGLTunnel } from '~/webgl/components/tunnel'

const WebGLBox = dynamic(
  () => import('./webgl.tsx').then(({ WebGLBox }) => WebGLBox),
  {
    ssr: false,
  }
)

export function Box({ className }: { className: string }) {
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
      <div ref={setRefs} className={className}>
        {/* WebGLTunnel content renders inside R3F Canvas (no Activity there) */}
        <WebGLTunnel>
          <WebGLBox rect={rect} />
        </WebGLTunnel>
      </div>
    </Activity>
  )
}
