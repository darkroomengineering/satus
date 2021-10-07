import { ScrollContext } from 'components/Scroll'
import { useContext, useEffect, useLayoutEffect } from 'react'
import s from './style.module.scss'

export default function Home() {
  const { scroll, isReady } = useContext(ScrollContext)

  // TIPS: get scroll position
  // useEffect(() => {
  //   if (!scroll) return

  //   const onScroll = (e) => {
  //     console.log(e)
  //   }

  //   scroll.on('scroll', onScroll)

  //   return () => {
  //     scroll.off('scroll', onScroll)
  //   }
  // }, [scroll, isReady])

  return <div className={s.pageHome}></div>
}
