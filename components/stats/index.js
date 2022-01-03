import { raf } from '@react-spring/rafz'
import { useLayoutEffect } from 'react'
import _Stats from 'stats.js'

export const Stats = () => {
  useLayoutEffect(() => {
    var stats = new _Stats()
    stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom)

    function onStart() {
      stats.begin()

      return true
    }

    function onFinish() {
      stats.end()

      return true
    }

    raf.onStart(onStart)
    raf.onFinish(onFinish)

    return () => {
      raf.cancel(onStart)
      raf.cancel(onFinish)
    }
  }, [])

  return null
}
