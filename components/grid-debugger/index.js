import { useMediaQuery } from 'hooks/use-media-query'
import { useState } from 'react'
import s from './grid-debugger.module.scss'

export const GridDebugger = () => {
  const [visible, set] = useState(false)
  const isMobile = useMediaQuery('(max-width: 800px)')

  return (
    <>
      <button
        data-scroll
        data-scroll-sticky
        data-scroll-target="#main"
        onClick={() => set(!visible)}
        className={s['grid-toggle']}
      >
        🌐
      </button>

      {!isMobile
        ? visible && (
            <div
              className={s.grid}
              id="DESKTOP"
              data-scroll
              data-scroll-sticky
              data-scroll-target="#main"
            >
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          )
        : visible && (
            <div
              className={s.grid}
              data-scroll
              data-scroll-sticky
              data-scroll-target="#main"
            >
              <span />
              <span />
              <span />
              <span />
            </div>
          )}
    </>
  )
}
