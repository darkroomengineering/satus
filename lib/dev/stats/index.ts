import { useEffect, useMemo } from 'react'
import _Stats from 'stats-gl'
import { useTempus } from 'tempus/react'
import s from './stats.module.css'

export function Stats() {
  const stats = useMemo(() => new _Stats({ minimal: false }), [])

  useEffect(() => {
    const domElement = (stats as unknown as { dom: HTMLElement }).dom
    document.body.appendChild(domElement)
    domElement.classList.add(s.stats)

    return () => {
      domElement.remove()
    }
  }, [stats])

  useTempus(
    () => {
      stats.begin()
    },
    {
      priority: Number.NEGATIVE_INFINITY,
    }
  )

  useTempus(
    () => {
      stats.end()
      stats.update()
    },
    {
      priority: Number.POSITIVE_INFINITY,
    }
  )

  return null
}
