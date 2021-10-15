## 2 ways to get scroll position

```javascript
//using store
import { raf } from '@react-spring/rafz'
import { useStore } from 'lib/store'

function update() {
  const scrollY = useStore.getState().scroll?.scroll?.y || 0
  return true
}

useEffect(() => {
  raf.onFrame(update)

  return () => {
    raf.cancel(update)
  }
}, [])
```

```javascript
//using context
const { scroll, isReady } = useContext(ScrollContext)

useEffect(() => {
  if (!scroll) return

  const onScroll = (e) => {
    const scrollY = e.scroll.y
  }

  scroll.on('scroll', onScroll)

  return () => {
    scroll.off('scroll', onScroll)
  }
}, [scroll, isReady])
```