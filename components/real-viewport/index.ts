'use client'

import { useLayoutEffect } from 'react'
import { mutate } from '~/libs/tempus-queue'

//https://css-tricks.com/the-trick-to-viewport-units-on-mobile/

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

let resizeTimeout: ReturnType<typeof setTimeout> | null = null

function onWindowResize() {
  // Throttle resize updates
  if (resizeTimeout !== null) {
    clearTimeout(resizeTimeout)
  }

  resizeTimeout = setTimeout(() => {
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
    resizeTimeout = null
  }, 100) // 100ms throttle
}

export function RealViewport() {
  useLayoutEffect(() => {
    // Set initial values immediately
    onWindowResize()

    window.addEventListener('resize', onWindowResize, false)

    return () => {
      window.removeEventListener('resize', onWindowResize, false)
      if (resizeTimeout !== null) {
        clearTimeout(resizeTimeout)
      }
    }
  }, [])

  return null
}
