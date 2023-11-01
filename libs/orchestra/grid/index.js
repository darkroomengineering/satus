import { useMediaQuery } from '@studio-freight/hamo'
import cn from 'clsx'
import { useMemo } from 'react'
import s from './grid.module.scss'

export function GridDebugger() {
  const isMobile = useMediaQuery('(max-width: 800px)')

  const columns = useMemo(() => {
    return parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--layout-columns-count',
      ),
    )
  }, [isMobile])

  return (
    <div className={s.grid}>
      <div className={cn('layout-grid', s.debugger)}>
        {new Array(columns).fill(0).map((_, key) => (
          <span key={key} />
        ))}
      </div>
    </div>
  )
}
