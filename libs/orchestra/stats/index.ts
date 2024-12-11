import { useFrame } from '@darkroom.engineering/hamo'
import { useEffect, useMemo } from 'react'
import _Stats from 'stats-gl'
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

  useFrame(() => {
    stats.begin()
  }, Number.NEGATIVE_INFINITY)

  useFrame(() => {
    stats.end()
    stats.update()
  }, Number.POSITIVE_INFINITY)

  return null
}
