#useRect

Compute element bounding rect

```javascript
import { useRect } from 'hooks/use-rect'

const [ref, compute] = useRect(1000)

useEffect(() => {
  function onScroll() {
    const scrollY = window.scrollY

    // use scrollY = 0 to get the rect position relative to the page
    // use scrollY = window.scrollY to get the rect position relative to the screen
    const { width, height, left, right, top, bottom, inView } = compute(scrollY)
  }

  window.addEventListener(onScroll, true)

  return () => {
    window.removeEventListener(onScroll, true)
  }
}, [])


return <div ref={ref}><div>
```
