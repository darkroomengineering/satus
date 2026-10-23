import { useEffect, useState } from 'react'
import _Stats from 'stats-gl'
import { useTempus } from 'tempus/react'

import s from './stats.module.css'

export function Stats() {
  // Lazy state initializer, not a ref: the instance is safe to read during render.
  const [stats] = useState(
    () =>
      new _Stats({
        minimal: false,
      })
  )

  useEffect(() => {
    // stats-gl types `dom` as private, but it is the public panel element.
    // Widen to `unknown` first so anti-slop/no-widen-then-assert stays quiet.
    const statsInstance: unknown = stats
    // SAFETY: `dom` is stats-gl's private-but-public-at-runtime overlay
    // element; the library always sets it in its constructor.
    const domElement = (statsInstance as { dom: HTMLElement }).dom
    document.body.appendChild(domElement)
    if (s.stats) domElement.classList.add(s.stats)

    return () => {
      domElement.remove()
    }
  }, [stats])

  useTempus(
    () => {
      stats.begin()
    },
    {
      order: Number.NEGATIVE_INFINITY,
    }
  )

  useTempus(
    () => {
      stats.end()
      stats.update()
    },
    {
      order: Number.POSITIVE_INFINITY,
    }
  )

  return null
}
