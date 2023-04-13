import { useFrame } from '@studio-freight/hamo'
import { useOrchestra } from 'lib/orchestra'
import { useEffect, useMemo } from 'react'
import _Stats from 'stats.js'

export function Stats() {
  const visible = useOrchestra(({ stats }) => stats)

  const stats = useMemo(() => new _Stats(), [])

  useEffect(() => {
    if (visible) {
      stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
      document.body.appendChild(stats.dom)

      return () => {
        stats.dom.remove()
      }
    } else {
      stats.dom.remove()
    }
  }, [stats, visible])

  useFrame(() => {
    if (!visible) return
    stats.begin()
  }, -Infinity)

  useFrame(() => {
    if (!visible) return
    stats.end()
  }, Infinity)
}
