import { Lenis } from '@studio-freight/react-lenis'
import cn from 'clsx'
import { Link } from 'components/link'
import { useStore } from 'libs/store'

import s from './navigation.module.scss'

export function Navigation() {
  const [isNavOpened] = useStore(
    ({ isNavOpened }) => [isNavOpened],
  )

  return (
    <Lenis className={cn(s.navigation, !isNavOpened && s.closed)}>
      <div className={s.content}>
      <Link href="/">home</Link>
        <Link href="/_debug/orchestra">debug</Link>
      </div>
    </Lenis>
  )
}
