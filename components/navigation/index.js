import s from './navigation.module.scss'
import cn from 'clsx'
import { useStore } from 'lib/store'
import { useLayoutEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import shallow from 'zustand/shallow'

export const Navigation = () => {
  const [navIsOpen, setNavIsOpen] = useStore(
    (state) => [state.navIsOpen, state.setNavIsOpen],
    shallow
  )

  const router = useRouter()

  useLayoutEffect(() => {
    const onRouteChange = () => {
      setNavIsOpen(false)
    }

    router.events.on('routeChangeStart', onRouteChange)

    return () => {
      router.events.off('routeChangeStart', onRouteChange)
    }
  }, [])

  return (
    <div
      className={cn(s.appNavigation, !navIsOpen && s['appNavigation--closed'])}
    >
      <Link href="/">
        <a>home</a>
      </Link>
      <Link href="/contact">
        <a>contact</a>
      </Link>
    </div>
  )
}
