```javascript
import { useStore } from 'lib/store'
import { useScroll } from 'hooks/use-scroll'

const locomotive = useStore((state) => state.locomotive)

useScroll(({ scroll }) => {
  const scrollY = scroll.y
}, 0)
```
