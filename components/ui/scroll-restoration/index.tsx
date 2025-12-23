'use client'

import { useEffect } from 'react'

export function ScrollRestoration({ type = 'auto' }) {
  useEffect(() => {
    history.scrollRestoration = type as ScrollRestoration
    if (type === 'manual') {
      window.scrollTo(0, 0)
    }
  }, [type])

  return null
}
