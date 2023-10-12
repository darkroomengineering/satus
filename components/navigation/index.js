import { Link } from '@studio-freight/compono'
import { Lenis } from '@studio-freight/react-lenis'
import cn from 'clsx'
import { useStore } from 'libs/store'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import s from './navigation.module.scss'

export function Navigation() {
  const [isNavOpened, setIsNavOpened] = useStore(
    ({ isNavOpened, setIsNavOpened }) => [isNavOpened, setIsNavOpened],
  )

  const router = useRouter()

  useEffect(() => {
    function onRouteChange() {
      setIsNavOpened(false)
    }

    router.events.on('routeChangeStart', onRouteChange)

    return () => {
      router.events.off('routeChangeStart', onRouteChange)
    }
  }, [])

  return (
    <Lenis className={cn(s.navigation, !isNavOpened && s.closed)}>
      <div className={s.content}>
        <Link href="/">home</Link>
        <Link href="/contact">contact</Link>
      </div>
    </Lenis>
  )
}
