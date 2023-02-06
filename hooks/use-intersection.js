import { useEffect, useState } from 'react'

export function useIntersection({
  root = null,
  rootMargin = '0px',
  threshold = 0,
  once = false,
} = {}) {
  const [element, setElement] = useState()
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    if (!element) return
    const intersection = new IntersectionObserver(
      ([{ isIntersecting }]) => {
        setIsIntersecting(isIntersecting)
        if (once) intersection.disconnect()
      },
      {
        root,
        rootMargin,
        threshold,
      }
    )
    intersection.observe(element)

    return () => {
      intersection.disconnect()
    }
  }, [element, root, rootMargin, threshold, once])

  return [isIntersecting, setElement]
}
