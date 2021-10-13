import s from './header.module.scss'
import Link from 'next/link'
import { Navigation } from 'components/Navigation'
import { useStore } from 'lib/store'
import cn from 'clsx'

export const Header = () => {
  const { toggleNav } = useStore((state) => ({ toggleNav: state.toggleNav }))

  return (
    <header className={s.appHeader}>
      <Navigation />
      <div className={cn('block', s.appHeader__head)}>
        <button onClick={toggleNav}>menu</button>
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
