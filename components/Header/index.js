import s from './style.module.scss'
import Link from 'next/link'

export const Header = () => {
  return (
    <header className={s.appHeader}>
      <Link href="/">
        <a>home</a>
      </Link>
      <Link href="/contact">
        <a>contact</a>
      </Link>
    </header>
  )
}
