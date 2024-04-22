import { useWindowSize } from '@darkroom.engineering/hamo'
import cn from 'clsx'
import { useMemo } from 'react'
import s from './grid.module.scss'

export function GridDebugger({ gridClassName = 'layout-grid' }) {
  const { width: windowWidth, height: windowHeight } = useWindowSize()

  const columns = useMemo(
    () =>
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--layout-columns-count',
        ),
      ),
    [windowWidth, windowHeight],
  )

  return (
    <div className={s.grid}>
      <div className={cn(gridClassName, s.debugger)}>
        {Array.from({ length: columns }).map((_, key) => (
          <span key={key} />
        ))}
      </div>
    </div>
  )
}
