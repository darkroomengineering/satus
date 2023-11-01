import { Link } from '@studio-freight/compono'
import cn from 'clsx'
import { Navigation } from 'components/navigation'
import { useStore } from 'libs/store'
import { forwardRef } from 'react'
import s from './header.module.scss'

export const Header = forwardRef((_, ref) => {
  const [isNavOpened, setIsNavOpened] = useStore(
    ({ isNavOpened, setIsNavOpened }) => [isNavOpened, setIsNavOpened],
  )

  return (
    <header className={s.header} ref={ref}>
      <Navigation />
      <div className={cn('layout-block', s.head)}>
        <button
          onClick={() => {
            setIsNavOpened(!isNavOpened)
          }}
        >
          menu
        </button>
        <div>
          <Link href="/_debug/orchestra" target="_blank" className="link">
            debug
          </Link>
        </div>
      </div>
    </header>
  )
})

Header.displayName = 'Header'
