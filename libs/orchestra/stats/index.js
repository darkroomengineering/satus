import { useFrame } from '@darkroom.engineering/hamo'
import { useCanvas } from 'libs/webgl/components/canvas'
import { useEffect, useMemo } from 'react'
import _Stats from 'stats-gl'
import s from './stats.module.scss'

export function Stats() {
  const { gl } = useCanvas()

  const stats = useMemo(() => new _Stats({ minimal: false }), [])

  useEffect(() => {
    document.body.appendChild(stats.dom)
    stats.dom.classList.add(s.stats)

    return () => {
      stats.dom.remove()
    }
  }, [stats, gl])

  useEffect(() => {
    if (gl) stats.init(gl)
  }, [stats, gl])

  useFrame(() => {
    stats.begin()
  }, -Infinity)

  useFrame(() => {
    stats.end()
    stats.update()
  }, Infinity)
}
