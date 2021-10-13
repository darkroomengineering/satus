TIPS: 2 ways to get scroll position

using store
import { raf } from '@react-spring/rafz'
import { useStore } from 'lib/store'

function update() {
  console.log(useStore.getState().scroll)
  return true
}

useEffect(() => {
  raf.onFrame(update)

  return () => {
    raf.cancel(update)
  }
}, [])

using context
const { scroll, isReady } = useContext(ScrollContext)

useEffect(() => {
  if (!scroll) return

  const onScroll = (e) => {
    console.log(e)
  }

  scroll.on('scroll', onScroll)

  return () => {
    scroll.off('scroll', onScroll)
  }
}, [scroll, isReady])