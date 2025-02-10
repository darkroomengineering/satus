import cn from 'clsx'
import { useWindowSize } from 'hamo'
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
        getComputedStyle(document.documentElement).getPropertyValue('--columns')
      ),
    [windowWidth, windowHeight]
  )

  return (
    <div className="fixed inset-0 pointer-events-none z-10000">
      <div className={cn(gridClassName, 'absolute inset-0', s.debugger)}>
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
