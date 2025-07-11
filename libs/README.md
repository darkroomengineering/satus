# Utility Libraries

This directory contains utility functions, type definitions, and shared libraries used throughout the application. These utilities provide common functionality and enhance development experience with TypeScript.

## Available Files

- `utils.ts` - General utility functions for common operations
- `store.ts` - Zustand-based state management utilities
- `tempus-queue.ts` - Queue utilities for Tempus animation library
- `augment.d.ts` - TypeScript type augmentations for third-party libraries
- `css.d.ts` - TypeScript definitions for CSS modules
- `reset.d.ts` - TypeScript reset type definitions

## Utility Functions (utils.ts)

Common utility functions for general-purpose operations:

```tsx
import { 
  slugify, 
  capitalize, 
  truncate,
  debounce,
  wait
} from '~/libs/utils'

// Convert string to URL-friendly slug
const slug = slugify('Hello World') // 'hello-world'

// Capitalize first letter
const capitalized = capitalize('hello') // 'Hello'

// Truncate text with ellipsis
const truncated = truncate('Long text to truncate', 10) // 'Long text...'

// Debounce a function call
const debouncedFunction = debounce(() => {
  // Expensive operation
}, 300)

// Await a timeout
await wait(500) // Pauses execution for 500ms
```

## Mathematical Utilities (utils.ts)

Mathematical functions for calculations and transformations:

```tsx
import { 
  clamp, 
  mapRange, 
  lerp,
  random,
  modulo
} from '~/libs/utils'

// Clamp a value between min and max
const clamped = clamp(150, 0, 100) // 100

// Map a value from one range to another
const mapped = mapRange(0.5, 0, 1, 0, 100) // 50

// Linear interpolation between two values
const interpolated = lerp(0, 100, 0.5) // 50

// Generate random number in range
const rand = random(10, 20) // Random number between 10-20

// Modulo that works correctly with negative numbers
const mod = modulo(-1, 5) // 4
```

## State Management (store.ts)

Zustand-based state management utilities:

```tsx
import { createStore } from '~/libs/store'

// Create a type-safe store
const useCounterStore = createStore(
  'counter', // Unique identifier
  {
    count: 0,
    increment: (state) => ({ count: state.count + 1 }),
    decrement: (state) => ({ count: state.count - 1 }),
    reset: () => ({ count: 0 })
  }
)

// Use in component
function Counter() {
  const { count, increment, decrement } = useCounterStore()
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  )
}
```

## Type Definitions

### augment.d.ts

Type augmentations for third-party libraries:

```tsx
// Example of augmented types in augment.d.ts
declare module 'some-library' {
  export interface Options {
    newOption: string
  }
}
```

### reset.d.ts

TypeScript reset definitions that improve type safety:

```tsx
// Based on @total-typescript/ts-reset
// Improves array methods type safety
const found: string | undefined = ['a', 'b'].find(x => x === 'c')
// Correctly typed as possibly undefined
```

## Best Practices

1. **Code Organization**
   - Keep utilities focused on a single responsibility
   - Group related functions together
   - Maintain clear naming conventions

2. **Performance**
   - Optimize computationally expensive operations
   - Memoize pure functions when appropriate
   - Use correct data structures for operations

3. **Type Safety**
   - Leverage TypeScript for type checking
   - Provide comprehensive type definitions
   - Use generics for flexible, type-safe functions

## Usage

Import utilities directly from their respective files:

```typescript
import { slugify, numberWithCommas, clamp, mapRange  } from '~/libs/utils'
import { store } from '~/libs/store'
```
