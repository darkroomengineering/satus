import { Link } from '@studio-freight/compono'
import cn from 'clsx'
import { Navigation } from 'components/navigation'
import { useStore } from 'libs/store'
import { forwardRef } from 'react'
import s from './header.module.scss'

export const Header = forwardRef((_, ref) => {
  const [navIsOpened, setNavIsOpened] = useStore(
    ({ navIsOpened, setNavIsOpened }) => [navIsOpened, setNavIsOpened],
  )

  return (
    <header className={s.header} ref={ref}>
      <Navigation />
      <div className={cn('layout-block', s.head)}>
        <button
          onClick={() => {
            setNavIsOpened(!navIsOpened)
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
