import { useEffect, useMemo } from 'react'
import _Stats from 'stats-gl'
import { useTempus } from 'tempus/react'
import s from './stats.module.css'

export function Stats() {
  const stats = useMemo(() => new _Stats({ minimal: false }), [])

  useEffect(() => {
    document.body.appendChild(stats.dom)
    stats.dom.classList.add(s.stats)

    return () => {
      stats.dom.remove()
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
}
