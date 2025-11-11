# RealViewport

A React component and Context Provider that sets CSS custom properties for viewport units and provides runtime access to viewport values.

## Features

- Sets CSS custom properties (`--vw`, `--dvh`, `--svh`, `--lvh`, `--scrollbar-width`)
- Provides React Context for runtime access to viewport values
- Synchronous updates to both CSS variables and React state
- Debounced resize handling for performance
- No race conditions when reading viewport values

## Usage

### Basic Usage (CSS Variables Only)

```tsx
import { RealViewport } from '~/components/real-viewport'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <RealViewport />
        {children}
      </body>
    </html>
  )
}
```

### With Runtime Access

```tsx
import { RealViewport, useRealViewport } from '~/components/real-viewport'

function MyComponent() {
  const { vw, dvh, svh, lvh, scrollbarWidth } = useRealViewport()
  
  // Access viewport values at runtime
  console.log('Current viewport width unit:', vw)
  console.log('Dynamic viewport height unit:', dvh)
  console.log('Small viewport height unit:', svh)
  console.log('Large viewport height unit:', lvh)
  console.log('Scrollbar width:', scrollbarWidth)
  
  return <div>...</div>
}

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <RealViewport>
          <MyComponent />
          {children}
        </RealViewport>
      </body>
    </html>
  )
}
```

## API

### `<RealViewport>`

Component that sets CSS custom properties and provides viewport context.

**Props:**
- `children?: React.ReactNode` - Optional children to wrap with the viewport context

### `useRealViewport()`

Hook that returns the current viewport values.

**Returns:**
```typescript
{
  vw: number          // Viewport width unit (1vw = viewport width * 0.01)
  dvh: number         // Dynamic viewport height unit (1dvh = window inner height * 0.01)
  svh: number         // Small viewport height unit (1svh = client height * 0.01)
  lvh: number         // Large viewport height unit (always 1)
  scrollbarWidth: number  // Width of the scrollbar in pixels
}
```

## Why multiply by 0.01?

The values are multiplied by 0.01 to emulate CSS viewport units. For example:
- `1vh` = 1% of viewport height
- `1svh` = `document.documentElement.clientHeight * 0.01`

This allows the component to provide accurate viewport unit values that match CSS behavior.
