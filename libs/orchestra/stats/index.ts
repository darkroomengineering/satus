import { useFrame } from '@darkroom.engineering/hamo'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import _Stats from 'stats-gl'
import s from './stats.module.css'

export function Stats() {
  const { gl } = useThree()

  const stats = useMemo(() => new _Stats({ minimal: false }), [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: gl dependency is needed to adjust on size changes
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
  }, Number.NEGATIVE_INFINITY)

  useFrame(() => {
    stats.end()
    stats.update()
  }, Number.POSITIVE_INFINITY)

  return null
}
