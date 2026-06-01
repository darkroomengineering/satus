import { useEffect, useRef } from 'react'
import _Stats from 'stats-gl'
import { useTempus } from 'tempus/react'
import s from './stats.module.css'

export function Stats() {
  const statsRef = useRef<_Stats | null>(null)
  if (!statsRef.current) {
    statsRef.current = new _Stats({
      minimal: false,
    } as ConstructorParameters<typeof _Stats>[0])
  }
  const stats = statsRef.current

  useEffect(() => {
    const domElement = (stats as unknown as { dom: HTMLElement }).dom
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
