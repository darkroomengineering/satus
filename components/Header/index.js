import s from './style.module.scss'
import Link from 'next/link'
import { Navigation } from 'components/Navigation'
import { useStore } from 'lib/store'

export const Header = () => {
  const { toggleNav } = useStore((state) => ({ toggleNav: state.toggleNav }))

  return (
    <header className={s.appHeader}>
      <Navigation />
      <div className={s.appHeader__head}>
        <button onClick={toggleNav}>menu</button>
        <div>
          <Link href="/">
            <a>home</a>
          </Link>
          <Link href="/contact">
            <a>contact</a>
          </Link>
        </div>
      </div>
    </header>
  )
}
