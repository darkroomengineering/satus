import { ScrollContext } from 'components/Scroll'
import { useContext, useEffect, useLayoutEffect } from 'react'
import s from './style.module.scss'
import { raf } from '@react-spring/rafz'
import { useStore } from 'lib/store'

export default function Home() {
  function update() {
    const y = useStore.getState()?.scroll?.scroll?.y
    return true
  }

  useEffect(() => {
    raf.onFrame(update)

    return () => {
      raf.cancel(update)
    }
  }, [])

  return <div className={s.pageHome}></div>
}
