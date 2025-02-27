# Custom React Hooks

This directory contains reusable React hooks that provide common functionality across the application. These hooks encapsulate complex logic and state management to simplify component implementation.

## Available Hooks

- `use-scroll-trigger.ts` - Hook for detecting and responding to scroll-based triggers and animations
- `use-transform.tsx` - Hook for handling element transformations with GSAP
- `use-device-detection.ts` - Hook for detecting device type and characteristics

## Detailed Usage

### useScrollTrigger

Provides scroll-based animation and trigger functionality. Useful for creating scroll-driven animations and effects.

```tsx
import { useScrollTrigger } from '~/hooks/use-scroll-trigger'

function ScrollAnimation() {
  const { ref, progress } = useScrollTrigger({
    start: 'top bottom', // Start when element's top reaches viewport bottom
    end: 'bottom top',   // End when element's bottom reaches viewport top
    scrub: true,         // Smooth animation that follows scroll position
    markers: true,       // Show debug markers (development only)
  })
  
  return (
    <div ref={ref} style={{ opacity: progress }}>
      This element fades in as you scroll
    </div>
  )
}
```

### useTransform

Manages element transformations and animations with GSAP, providing a declarative way to handle complex animations.

```tsx
import { useTransform } from '~/hooks/use-transform'

function AnimatedElement() {
  const { ref, setTransform } = useTransform()
  
  // Trigger an animation
  const handleHover = () => {
    setTransform({
      x: 20,
      y: 10,
      rotation: 5,
      scale: 1.1,
      duration: 0.5,
      ease: 'power2.out',
    })
  }
  
  // Reset animation
  const handleLeave = () => {
    setTransform({
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 0.3,
    })
  }
  
  return (
    <div 
      ref={ref}
      onMouseEnter={handleHover}
      onMouseLeave={handleLeave}
    >
      Hover me for animation
    </div>
  )
}
```

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

- Scroll-based animations and triggers
- Element transformations with GSAP integration
- Device detection and responsive behavior
- Type-safe implementations with TypeScript

## Usage

Import hooks directly from this directory:

```typescript
import { useScrollTrigger } from '~/hooks/use-scroll-trigger'
import { useTransform } from '~/hooks/use-transform'
import { useDeviceDetection } from '~/hooks/use-device-detection'
```
