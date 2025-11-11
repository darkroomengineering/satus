'use client'

import { createContext, useContext, useLayoutEffect, useState } from 'react'
import { mutate } from '~/libs/tempus-queue'

type ViewportValues = {
  vw: number
  dvh: number
  svh: number
  lvh: number
  scrollbarWidth: number
}

const RealViewportContext = createContext<ViewportValues>({
  vw: 0,
  dvh: 0,
  svh: 0,
  lvh: 0,
  scrollbarWidth: 0,
})

export function useRealViewport() {
  return useContext(RealViewportContext)
}

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

function createOnWindowResize(
  setViewportValues: (values: ViewportValues) => void
) {
  return () => {
    mutate(() => {
      const vw = document.documentElement.offsetWidth * 0.01
      const dvh = window.innerHeight * 0.01
      const svh = document.documentElement.clientHeight * 0.01
      const lvh = 1
      const scrollbarWidth = getScrollbarWidth()

      // Set CSS custom properties
      document.documentElement.style.setProperty(
        '--vw',
        `${Math.round(vw * 100) / 100}px`
      )
      document.documentElement.style.setProperty(
        '--dvh',
        `${Math.round(dvh * 100) / 100}px`
      )
      document.documentElement.style.setProperty(
        '--svh',
        `${Math.round(svh * 100) / 100}px`
      )
      document.documentElement.style.setProperty('--lvh', '1vh')
      document.documentElement.style.setProperty(
        '--scrollbar-width',
        `${Math.round(scrollbarWidth * 100) / 100}px`
      )

      // Update React state synchronously
      setViewportValues({
        vw,
        dvh,
        svh,
        lvh,
        scrollbarWidth,
      })
    })
  }
}

export function RealViewport({ children }: { children?: React.ReactNode }) {
  const [viewportValues, setViewportValues] = useState<ViewportValues>({
    vw: 0,
    dvh: 0,
    svh: 0,
    lvh: 0,
    scrollbarWidth: 0,
  })

  useLayoutEffect(() => {
    const onWindowResize = createOnWindowResize(setViewportValues)
    const debouncedOnWindowResize = debounce(onWindowResize, 500)

    // Set initial values immediately
    onWindowResize()

    window.addEventListener('resize', debouncedOnWindowResize, false)

    return () => {
      window.removeEventListener('resize', debouncedOnWindowResize, false)
    }
  }, [])

  return (
    <RealViewportContext.Provider value={viewportValues}>
      {children}
    </RealViewportContext.Provider>
  )
}
