# GSAP Integration

## Setup

### Basic Installation
Satūs comes with GSAP pre-installed. To enable GSAP and ScrollTrigger in your project, add the `<GSAPRuntime />` component in `app/layout.tsx` (it wires GSAP to Tempus and registers ScrollTrigger with Lenis):

```jsx
// app/layout.tsx
import { GSAPRuntime } from '~/components/gsap/runtime'

// inside <body>
<GSAPRuntime />
```

This will:
- Synchronize GSAP's ticker with [Tempus](https://www.npmjs.com/package/tempus) for better performance
- Register and configure ScrollTrigger with [Lenis](https://www.npmjs.com/package/lenis)

### GSAP Business License
For projects requiring premium GSAP features:

1. Add your GSAP token to `.env`:
```bash
GSAP_AUTH_TOKEN=your-gsap-auth-token
```

2. If you plan to use GSAP Business plugins, configure your npm scope with your token. With Bun, you can set `npmScopes` in `package.json` or use an `.npmrc`. Example `.npmrc`:
```
@gsap:registry=https://npm.greensock.com
//npm.greensock.com/:_authToken=${GSAP_AUTH_TOKEN}
```

3. Install GSAP Business:
```bash
bun install gsap@npm:@gsap/business
```

## Usage

### Basic Animation
```jsx
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

export function Component() {
  useGSAP(() => {
    gsap.to('.target', {
      x: 100,
      duration: 1
    })
  })

  return <div className="target">Animated element</div>
}
```

### ScrollTrigger
When using ScrollTrigger, make sure you've enabled it in the GSAP component:

`GSAPRuntime` already initializes ScrollTrigger and syncs with Lenis. In your component you can use it directly:

```jsx
useGSAP(() => {
  gsap.to('.target', {
    scrollTrigger: {
      trigger: '.target',
      start: 'top center',
      end: 'bottom center',
      scrub: true
    },
    y: 100
  })
})
```

## Advanced Features

### Integration with Tempus
GSAP's ticker is automatically synchronized with Tempus through the `<GSAP>` component, providing:
- Consistent frame timing
- Better performance
- Synchronized animations across the application

### Premium Plugins
With GSAP Business license, you get access to:
- ScrollTrigger
- SplitText
- Flip
- Observer
- ScrollTo
- DrawSVG
- MotionPath
- MorphSVG

## References
- [GSAP Documentation](https://gsap.com/docs/v3/)
- [GSAP Business](https://gsap.com/pricing/)
- [ScrollTrigger Documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [Tempus Documentation](https://www.npmjs.com/package/tempus)
