// import { Link } from '@studio-freight/compono'
import { Lenis } from '@studio-freight/react-lenis'
import cn from 'clsx'
import { useStore } from 'libs/store'
import Link from 'next/link'
import { shallow } from 'zustand/shallow'
import s from './navigation.module.scss'

export function Navigation() {
  const [navIsOpened] = useStore(
    ({ navIsOpened, setNavIsOpened }) => [navIsOpened, setNavIsOpened],
    shallow,
  )

  return (
    <Lenis className={cn(s.navigation, !navIsOpened && s.closed)}>
      <div className={s.content}>
        <Link href="/">home</Link>
        <Link href="/_debug/orchestra">debug</Link>
      </div>
    </Lenis>
  )
}
