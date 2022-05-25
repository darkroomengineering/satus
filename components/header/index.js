import cn from 'clsx'
import { Link } from 'components/link'
import { Navigation } from 'components/navigation'
import { useStore } from 'lib/store'
import shallow from 'zustand/shallow'
import { Cart } from './cart'
import s from './header.module.scss'

export const Header = ({ headerRef, className }) => {
  const [navIsOpen, setNavIsOpen] = useStore(
    (state) => [state.navIsOpen, state.setNavIsOpen],
    shallow
  )
  const setToggleCart = useStore((state) => state.setToggleCart)

  return (
    <>
      <header className={s.header} ref={headerRef}>
        <Navigation />
        <div className={cn('layout-block', s.head)}>
          <button
            onClick={() => {
              setNavIsOpen(!navIsOpen)
            }}
          >
            menu
          </button>
          <Link href="/">home</Link>/<Link href="/contact">contact</Link>
        </div>
      </header>
      <Cart />
    </>
  )
}
