```javascript
import { useStore } from 'lib/store'
import { useFrame } from 'hooks/use-frame'

const locomotive = useStore((state) => state.locomotive)

useFrame(() => {
  const scrollY = locomotive?.scroll.instance.scroll.y || 0
}, 0)
```
