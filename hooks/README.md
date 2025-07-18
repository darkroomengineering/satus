# Custom React Hooks

This directory contains reusable React hooks that provide common functionality across the application. These hooks encapsulate complex logic and state management to simplify component implementation.

## Available Hooks

- `use-device-detection.ts` - Hook for detecting device type and characteristics
- `use-performance.ts` - Hook for tracking Core Web Vitals and performance metrics
- `use-prefetch.ts` - Hook for prefetching routes when elements become visible
- `use-scroll-trigger.ts` - Hook for detecting and responding to scroll-based triggers and animations
- `use-transform.tsx` - Hook for handling element transformations with GSAP

## Detailed Usage

### useDeviceDetection

Detects device type and characteristics to adapt components for different devices.

```tsx
import { useDeviceDetection } from '~/hooks/use-device-detection'

function ResponsiveComponent() {
  const { isMobile, isTablet, isDesktop, isTouch } = useDeviceDetection()
  
  return (
    <div>
      {isMobile && <MobileLayout />}
      {isTablet && <TabletLayout />}
      {isDesktop && <DesktopLayout />}
      
      {isTouch ? (
        <TouchInteractions />
      ) : (
        <MouseInteractions />
      )}
    </div>
  )
}
```

### usePerformance

Automatically tracks and reports Core Web Vitals metrics to analytics services.

```tsx
import { usePerformance } from '~/hooks/use-performance'

// Add to your root layout or app component
function App() {
  usePerformance()
  return <>{/* Your app */}</>
}
```

### usePrefetch

Prefetches routes when elements become visible in the viewport.

```tsx
import { usePrefetch } from '~/hooks/use-prefetch'

function ProductCard({ href }: { href: string }) {
  const prefetchRef = usePrefetch(href)
  
  return (
    <div ref={prefetchRef}>
      <Link href={href}>View Product</Link>
    </div>
  )
}
```

### useScrollTrigger

Provides scroll-based animation and trigger functionality. Useful for creating scroll-driven animations and effects.

```tsx
import { useRect } from 'hamo/use-rect'
import { useScrollTrigger } from '~/hooks/use-scroll-trigger'

function ScrollAnimation() {
  const [setRectRef, rect] = useRect()

  useScrollTrigger({
    rect,
    start: 'bottom bottom', // Start when element's top reaches viewport bottom
    end: 'center center',   // End when element's bottom reaches viewport top
    scrub: true,         // Smooth animation that follows scroll position
    markers: true,       // Show debug markers (development only)
    onProgress: ({ progress }) => {
      console.log(progress)
      rect.element.style.opacity = progress
    },
  })
  
  return (
    <div ref={setRectRef}>
      This element appears in as you scroll
    </div>
  )
}
```

### useTransform

Manages element transformations and animations with GSAP, providing a declarative way to handle complex animations.

```tsx
import { TransformProvider } from '~/hooks/use-transform'

function AnimatedElement() {
  const transformProviderRef = useRef<TransformRef>(null)

  useEffect(() => {
    // Set transform values
    transformProviderRef.current?.setTranslate(0, 100, 0)
  }, [])

  useTransform(({ translate, rotate, scale, clip }) => {
    // listen to transform changes
    console.log(translate, rotate, scale, clip)
  },[])

  return (
    <TransformProvider ref={transformProviderRef}>
      <div>
        <h1>Hello</h1>
      </div>
    </TransformProvider>
  )
}
```

## Integration with Other Libraries

These hooks are designed to work seamlessly with:

- GSAP for animations
- Lenis for smooth scrolling
- Hamo for utility functions
- Tempus for timing utilities

## Best Practices

1. **Performance**
   - Use memoization to prevent unnecessary recalculations
   - Implement cleanup functions to prevent memory leaks
   - Use `useCallback` and `useMemo` for optimization

2. **Reusability**
   - Keep hooks focused on a single responsibility
   - Use TypeScript for type safety
   - Provide sensible defaults
   - Document parameter options

3. **Debugging**
   - Include development-only debugging options
   - Provide clear error messages
   - Use descriptive variable names

## Features

- Device detection and responsive behavior
- Performance monitoring with Core Web Vitals
- Route prefetching for improved navigation
- Scroll-based animations and triggers
- Element transformations with GSAP integration
- Type-safe implementations with TypeScript

## Usage

Import hooks directly from this directory:

```typescript
import { useDeviceDetection } from '~/hooks/use-device-detection'
import { usePerformance } from '~/hooks/use-performance'
import { usePrefetch } from '~/hooks/use-prefetch'
import { useScrollTrigger } from '~/hooks/use-scroll-trigger'
import { useTransform } from '~/hooks/use-transform'
```
