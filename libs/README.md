# Utility Libraries

This directory contains utility functions, type definitions, and shared libraries used throughout the application. These utilities provide common functionality and enhance development experience with TypeScript.

## Available Files

### Core Utilities
- `utils.ts` - General utility functions for common operations
- `store.ts` - Zustand-based state management utilities
- `tempus-queue.ts` - Queue utilities for Tempus animation library
- `easings.ts` - Easing functions for animations

### Type Definitions
- `augment.d.ts` - TypeScript type augmentations for third-party libraries
- `css.d.ts` - TypeScript definitions for CSS modules
- `reset.d.ts` - TypeScript reset type definitions

### Development Tools
- `validate-env.ts` - Environment variable validation (importable + executable)
- `cleanup-integrations.ts` - Integration cleanup utilities (importable + executable)
- `fetch-with-timeout.ts` - Fetch wrapper with timeout protection
- `metadata.ts` - Metadata generation helpers for SEO

## Utility Functions (utils.ts)

Common utility functions for general-purpose operations:

```tsx
import { 
  slugify,
  numberWithCommas,
  clamp,
  mapRange
} from '~/libs/utils'

// Convert string to URL-friendly slug
const slug = slugify('Hello World') // 'hello-world'

// Add thousands separators
const formatted = numberWithCommas(1234567) // '1,234,567'
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

## Development Tools

### Environment Validation (validate-env.ts)

Validates environment variables and shows which integrations are configured:

```bash
# Run as CLI script
bun libs/validate-env.ts
# or via package.json script
bun validate:env
```

```typescript
// Import and use in code
import { validateEnv } from '~/libs/validate-env'

const result = validateEnv({ silent: false })
if (!result.valid) {
  console.error('Missing required environment variables')
}
```

### Integration Cleanup (cleanup-integrations.ts)

Identifies unused integrations and provides removal instructions:

```bash
# Run as CLI script
bun libs/cleanup-integrations.ts
# or via package.json script
bun cleanup:integrations
```

```typescript
// Import and use in code
import { 
  getRemovalGuide, 
  printCleanupInstructions,
  REMOVAL_GUIDE 
} from '~/libs/cleanup-integrations'

// Get specific integration removal guide
const sanityGuide = getRemovalGuide('Sanity')

// Print all cleanup instructions
printCleanupInstructions()
```

### Fetch with Timeout (fetch-with-timeout.ts)

Prevent hanging requests with automatic timeout protection:

```typescript
import { fetchWithTimeout, fetchJSON } from '~/libs/fetch-with-timeout'

// Basic fetch with 10s timeout
const response = await fetchWithTimeout('https://api.example.com/data', {
  timeout: 10000, // optional, defaults to 10000ms
  method: 'POST',
})

// JSON fetch with automatic parsing
const data = await fetchJSON<{ name: string }>('https://api.example.com/user', {
  timeout: 5000
})
```

### Metadata Helpers (metadata.ts)

Generate consistent metadata for SEO:

```typescript
import { generatePageMetadata, generateSanityMetadata } from '~/libs/metadata'

// For custom pages
export async function generateMetadata({ params }) {
  return generatePageMetadata({
    title: 'My Page',
    description: 'Page description',
    url: `/page/${params.slug}`,
    image: { url: '/og-image.jpg' },
  })
}

// For Sanity CMS pages
export async function generateMetadata({ params }) {
  const { data } = await sanityFetch({ query: pageQuery, params })
  
  return generateSanityMetadata({
    document: data,
    url: `/sanity/${params.slug}`,
  })
}
```

## Usage

Import utilities directly from their respective files:

```typescript
import { slugify, numberWithCommas, clamp, mapRange  } from '~/libs/utils'
import { useStore } from '~/libs/store'
import { validateEnv } from '~/libs/validate-env'
import { getRemovalGuide } from '~/libs/cleanup-integrations'
import { fetchWithTimeout } from '~/libs/fetch-with-timeout'
import { generatePageMetadata } from '~/libs/metadata'
```
