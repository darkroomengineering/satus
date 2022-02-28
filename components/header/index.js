import cn from 'clsx'
import { Navigation } from 'components/navigation'
import { useStore } from 'lib/store'
import Link from 'next/link'
import shallow from 'zustand/shallow'
import { Cart } from './cart'
import s from './header.module.scss'

export const Header = () => {
  const locomotive = useStore((state) => state.locomotive)
  const [navIsOpen, setNavIsOpen] = useStore(
    (state) => [state.navIsOpen, state.setNavIsOpen],
    shallow
  )
  const setToggleCart = useStore((state) => state.setToggleCart)

  return (
    <>
      <header className={s.header}>
        <Navigation />
        <div className={cn('block', s.header__head)}>
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
            <button
              onClick={() => {
                setToggleCart(true)
                locomotive.stop()
              }}
            >
              Cart
            </button>
          </div>
        </div>
      </header>
      <Cart />
    </>
  )
}
