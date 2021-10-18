import s from './header.module.scss'
import Link from 'next/link'
import { Navigation } from 'components/navigation'
import { useStore } from 'lib/store'
import cn from 'clsx'
import shallow from 'zustand/shallow'

export const Header = () => {
  const [navIsOpen, setNavIsOpen] = useStore(
    (state) => [state.navIsOpen, state.setNavIsOpen],
    shallow
  )

  return (
    <header className={s.appHeader}>
      <Navigation />
      <div className={cn('block', s.appHeader__head)}>
        <button
          onClick={() => {
            setNavIsOpen(!navIsOpen)
          }}
        >
          menu
        </button>
        <div>
          <Link href="/">
            <a>home</a>
          </Link>
          /
          <Link href="/contact">
            <a>contact</a>
          </Link>
        </div>
      </div>
    </header>
  )
}
