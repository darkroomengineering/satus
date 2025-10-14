'use client'

import { useLayoutEffect } from 'react'
import { mutate } from '~/libs/tempus-queue'

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

let cachedScrollbarWidth: number | null = null

function getScrollbarWidth() {
  // Return cached value if available
  if (cachedScrollbarWidth !== null) {
    return cachedScrollbarWidth
  }

  // Creating invisible container
  const outer = document.createElement('div')
  outer.style.visibility = 'hidden'
  outer.style.overflow = 'scroll' // forcing scrollbar to appear
  document.body.appendChild(outer)

  // Creating inner element and placing it in the container
  const inner = document.createElement('div')
  outer.appendChild(inner)

  // Calculating difference between container's full width and the child width
  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth

  // Removing temporary elements from the DOM
  outer.remove()

  // Cache the result
  cachedScrollbarWidth = scrollbarWidth

  return scrollbarWidth
}

function onWindowResize() {
  mutate(() => {
    document.documentElement.style.setProperty(
      '--vw',
      `${document.documentElement.offsetWidth * 0.01}px`
    )

    document.documentElement.style.setProperty(
      '--dvh',
      `${window.innerHeight * 0.01}px`
    )

    document.documentElement.style.setProperty(
      '--svh',
      `${document.documentElement.clientHeight * 0.01}px`
    )

    document.documentElement.style.setProperty('--lvh', '1vh')

    document.documentElement.style.setProperty(
      '--scrollbar-width',
      `${getScrollbarWidth()}px`
    )
  })
}

const debouncedOnWindowResize = debounce(onWindowResize, 500)

export function RealViewport() {
  useLayoutEffect(() => {
    // Set initial values immediately
    onWindowResize()

    window.addEventListener('resize', debouncedOnWindowResize, false)

    return () => {
      window.removeEventListener('resize', debouncedOnWindowResize, false)
    }
  }, [])

  return null
}
