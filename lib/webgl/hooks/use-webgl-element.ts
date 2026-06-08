'use client'

import { type Rect, useRect } from 'hamo'
import { useEffect, useState } from 'react'

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
  // Track element in state so the effect re-runs when the element changes
  const [element, setElement] = useState<T | null>(null)

  // Ref callback: store element and forward to rect tracker only
  const setRef = (node: T | null) => {
    setRectRef(node)
    setElement(node)
  }

  // Single effect owns the IntersectionObserver lifecycle
  useEffect(() => {
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsVisible(entry.isIntersecting)
      },
      { rootMargin, threshold: threshold ?? 0 }
    )
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [element, rootMargin, threshold])

  return {
    setRef,
    rect,
    isVisible,
  }
}
