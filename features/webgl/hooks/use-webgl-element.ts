'use client'

import { type Rect, useRect } from 'hamo'
import { useEffect, useRef, useState } from 'react'

type UseWebGLElementOptions = {
  /** Margin around the viewport to trigger visibility earlier (default: '200px') */
  rootMargin?: string
  /** Intersection threshold(s) to trigger visibility */
  threshold?: number | number[]
  /** Initial visibility state (default: true for SSR) */
  initialVisible?: boolean
}

type UseWebGLElementReturn<T extends HTMLElement = HTMLElement> = {
  /** Ref callback to attach to the DOM element - handles both rect and visibility */
  setRef: (element: T | null) => void
  /** Current bounding rect of the element */
  rect: Rect
  /** Whether the element is currently visible (or within rootMargin) */
  isVisible: boolean
}

/**
 * Unified hook for WebGL elements that combines rect tracking and visibility detection.
 *
 * Simplifies the common pattern of needing both `useRect` and visibility for WebGL components.
 * Returns a single ref callback that handles both concerns, eliminating the need for manual
 * ref combining.
 *
 * @example
 * ```tsx
 * function WebGLComponent({ className }: { className: string }) {
 *   const { setRef, rect, isVisible } = useWebGLElement()
 *
 *   return (
 *     <div ref={setRef} className={className}>
 *       <WebGLTunnel>
 *         <WebGLMesh rect={rect} visible={isVisible} />
 *       </WebGLTunnel>
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom visibility options
 * const { setRef, rect, isVisible } = useWebGLElement({
 *   rootMargin: '400px',  // Preload earlier
 *   threshold: 0.1,       // 10% visible triggers
 * })
 * ```
 */
export function useWebGLElement<T extends HTMLElement = HTMLElement>({
  rootMargin = '200px',
  threshold,
  initialVisible = true,
}: UseWebGLElementOptions = {}): UseWebGLElementReturn<T> {
  const [isVisible, setIsVisible] = useState(initialVisible)
  const [setRectRef, rect] = useRect()
  const elementRef = useRef<T | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Combined ref callback that handles both rect tracking and visibility observation
  const setRef = (element: T | null) => {
    // Update rect ref
    setRectRef(element)

    // Handle observer cleanup and setup
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    elementRef.current = element

    if (element) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry) setIsVisible(entry.isIntersecting)
        },
        { rootMargin, threshold: threshold ?? 0 }
      )
      observerRef.current.observe(element)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  // Handle option changes by re-creating observer
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Recreate observer with new options
    observerRef.current?.disconnect()
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsVisible(entry.isIntersecting)
      },
      { rootMargin, threshold: threshold ?? 0 }
    )
    observerRef.current.observe(element)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [rootMargin, threshold])

  return {
    setRef,
    rect,
    isVisible,
  }
}
