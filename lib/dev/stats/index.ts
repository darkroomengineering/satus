import { useEffect, useState } from 'react'
import _Stats from 'stats-gl'
import { useTempus } from 'tempus/react'

import s from './stats.module.css'

export function Stats() {
  // Instantiate once via a lazy state initializer. The instance is stable for
  // the component's lifetime and — unlike a ref — is safe to read during render.
  const [stats] = useState(
    () =>
      new _Stats({
        minimal: false,
      })
  )

  useEffect(() => {
    // stats-gl declares `dom` as a private class field, but it is a real
    // runtime property meant to be appended to the DOM (that's how the
    // library's own usage docs mount the panel) — TypeScript just doesn't
    // expose it. Two honest steps: widen to `unknown` first (never flagged,
    // since it isn't narrowing away known evidence), then assert the one
    // field this component actually reads off the instance.
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
