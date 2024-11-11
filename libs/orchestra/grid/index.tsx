import { useWindowSize } from '@darkroom.engineering/hamo'
import cn from 'clsx'
import { useMemo } from 'react'
import s from './grid.module.css'

type GridDebuggerProps = {
  gridClassName?: string
}

export function GridDebugger({
  gridClassName = 'layout-grid',
}: GridDebuggerProps) {
  const { width: windowWidth, height: windowHeight } = useWindowSize()

  // biome-ignore lint/correctness/useExhaustiveDependencies: columns dependency is needed to adjust on size changes
  const columns = useMemo(
    () =>
      Number.parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--layout-columns-count'
        )
      ),
    [windowWidth, windowHeight]
  )

  return (
    <div className={s.grid}>
      <div className={cn(gridClassName, s.debugger)}>
        {Array.from({ length: columns }).map((_, index) => (
          <span
            key={`column-${
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
              index
            }`}
          />
        ))}
      </div>
    </div>
  )
}
