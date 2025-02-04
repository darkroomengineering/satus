'use client'

import { useLayoutEffect } from 'react'

//https://css-tricks.com/the-trick-to-viewport-units-on-mobile/

function getScrollbarWidth() {
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

  return scrollbarWidth
}

function onWindowResize() {
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
}

export function RealViewport() {
  useLayoutEffect(() => {
    window.addEventListener('resize', onWindowResize, false)
    onWindowResize()

    return () => {
      window.removeEventListener('resize', onWindowResize, false)
    }
  }, [])

  return null
}
