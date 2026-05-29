import cn from 'clsx'
import { useWindowSize } from 'hamo'
import s from './grid.module.css'

type GridDebuggerProps = {
  gridClassName?: string
}

export function GridDebugger({
  gridClassName = 'dr-layout-grid',
}: GridDebuggerProps) {
  // useWindowSize triggers re-render on resize; columns is re-read from CSS each render
  useWindowSize()
  const columns = Number.parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--columns'),
    10
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-10000">
      <div className={cn(gridClassName, 'absolute inset-0', s.debugger)}>
        {Array.from({ length: columns }).map((_, index) => (
          <span
            key={`column-${
              // biome-ignore lint/suspicious/noArrayIndexKey: grid columns are static
              index
            }`}
          />
        ))}
      </div>
    </div>
  )
}
