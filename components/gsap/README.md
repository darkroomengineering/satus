# GSAP Integration

## Setup

### Basic Installation
Satūs comes with GSAP pre-installed. To enable GSAP in your project, use the `<GSAP>` component at the root level:

```jsx
<GSAP scrollTrigger />
```

This will:
- Synchronize GSAP's ticker with [Tempus](https://www.npmjs.com/package/tempus) for better performance
- Setup ScrollTrigger integration with [Lenis](https://www.npmjs.com/package/lenis) if the `scrollTrigger` prop is passed

### GSAP Business License
For projects requiring premium GSAP features:

1. Add your GSAP token to `.env`:
```bash
GSAP_AUTH_TOKEN=your-gsap-auth-token
```

2. The project includes a `bunfig.toml` that configures the GSAP Business scope:
```toml
[install.scopes]
"@gsap" = { token = "$GSAP_AUTH_TOKEN", url = "https://npm.greensock.com/" }
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

```jsx
// At your app's root
<GSAP scrollTrigger />

// In your component
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
