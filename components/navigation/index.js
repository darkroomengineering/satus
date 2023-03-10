import { Link } from '@studio-freight/compono'
import { Lenis } from '@studio-freight/react-lenis'
import cn from 'clsx'
import { useStore } from 'lib/store'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { shallow } from 'zustand/shallow'
import s from './navigation.module.scss'

export function Navigation() {
  const [navIsOpened, setNavIsOpened] = useStore(
    ({ navIsOpened, setNavIsOpened }) => [navIsOpened, setNavIsOpened],
    shallow
  )

  const router = useRouter()

  useEffect(() => {
    function onRouteChange() {
      setNavIsOpened(false)
    }

    router.events.on('routeChangeStart', onRouteChange)

    return () => {
      router.events.off('routeChangeStart', onRouteChange)
    }
  }, [])

  return (
    <Lenis className={cn(s.navigation, !navIsOpened && s.closed)}>
      <div className={s.content}>
        <Link href="/">home</Link>
        <Link href="/gsap">gsap</Link>
        <Link href="/contact">contact</Link>
      </div>
    </Lenis>
  )
}
