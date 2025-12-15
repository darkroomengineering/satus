# Lib - Utilities, Hooks & Features

Central directory for all non-UI code: utilities, hooks, integrations, and optional features.

> **Mental model:** "If it renders UI, it's in `components/`. Everything else is in `lib/`."

## Structure

```
lib/
├── hooks/                    # Custom React hooks
├── integrations/             # Third-party services (optional)
│   ├── sanity/              # Headless CMS
│   ├── shopify/             # E-commerce
│   ├── hubspot/             # Marketing forms
│   ├── mailchimp/           # Email marketing
│   └── mandrill/            # Transactional email
├── webgl/                    # 3D graphics (optional)
├── dev/                      # Debug tools (optional)
├── scripts/                  # CLI tools
│   ├── dev.ts               # Dev server runner
│   ├── setup-project.ts     # Project setup wizard
│   └── integration-bundles.ts
├── styles/                   # CSS & Tailwind system
│   ├── css/                 # Generated CSS
│   ├── scripts/             # Style generation
│   └── *.ts                 # Config (colors, fonts, etc.)
├── utils.ts                  # General utilities
├── store.ts                  # Zustand state management
├── fetch-with-timeout.ts     # API resilience
├── metadata.ts               # SEO helpers
├── validate-env.ts           # Environment validation
└── *.d.ts                    # Type definitions
```

## Subdirectories

| Directory | Purpose | Optional? |
|-----------|---------|-----------|
| `hooks/` | Custom React hooks | ❌ Core |
| `scripts/` | CLI tools | ❌ Core |
| `styles/` | CSS & Tailwind | ❌ Core |
| `integrations/` | Third-party services | ✅ Yes |
| `webgl/` | 3D graphics | ✅ Yes |
| `dev/` | Debug tools (CMD+O) | ✅ Yes |

See individual READMEs:
- [Styles](./styles/README.md)
- [Integrations](./integrations/README.md)
- [WebGL](./webgl/README.md)
- [Dev Tools](./dev/README.md)

## Custom Hooks

Import hooks from `~/lib/hooks`:

```tsx
import { useDeviceDetection } from '~/lib/hooks/use-device-detection'
import { usePrefetch } from '~/lib/hooks/use-prefetch'
import { useScrollTrigger } from '~/lib/hooks/use-scroll-trigger'
import { useTransform } from '~/lib/hooks/use-transform'
```

### Available Hooks

- **`useDeviceDetection`** - Detect device type (mobile/desktop/tablet)
- **`usePrefetch`** - Prefetch routes on hover/focus
- **`useScrollTrigger`** - GSAP ScrollTrigger integration
- **`useTransform`** - Transform values based on scroll position

## Utility Functions (utils.ts)

Common utility functions for general-purpose operations:

```tsx
import { 
  slugify,
  numberWithCommas,
  clamp,
  mapRange
} from '~/lib/utils'

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
} from '~/lib/utils'

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
import { createStore } from '~/lib/store'

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

## Best Practices

1. **Code Organization**
   - Keep utilities focused on a single responsibility
   - Group related functions together
   - Maintain clear naming conventions

2. **Performance**
   - React Compiler handles most memoization automatically
   - See [root README](../../README.md#react-compiler--memoization) for details
   - Optimize computationally expensive operations
   - Use correct data structures for operations
   - Use `useRef` for object instantiation (prevents infinite loops)

3. **Type Safety**
   - Leverage TypeScript for type checking
   - Provide comprehensive type definitions
   - Use generics for flexible, type-safe functions

## Development Tools

### Environment Validation (validate-env.ts)

Validates environment variables and shows which integrations are configured:

```bash
# Run as CLI script
bun lib/validate-env.ts
# or via package.json script
bun validate:env
```

```typescript
// Import and use in code
import { validateEnv } from '~/lib/validate-env'

const result = validateEnv({ silent: false })
if (!result.valid) {
  console.error('Missing required environment variables')
}
```

### Integration Cleanup (cleanup-integrations.ts)

Identifies unused integrations and provides removal instructions:

```bash
# Run as CLI script
bun lib/cleanup-integrations.ts
# or via package.json script
bun cleanup:integrations
```

```typescript
// Import and use in code
import { 
  getRemovalGuide, 
  printCleanupInstructions,
  REMOVAL_GUIDE 
} from '~/lib/cleanup-integrations'

// Get specific integration removal guide
const sanityGuide = getRemovalGuide('Sanity')

// Print all cleanup instructions
printCleanupInstructions()
```

### Fetch with Timeout (fetch-with-timeout.ts)

Prevent hanging requests with automatic timeout protection:

```typescript
import { fetchWithTimeout, fetchJSON } from '~/lib/fetch-with-timeout'

// Basic fetch with 10s timeout (default)
const response = await fetchWithTimeout('https://api.example.com/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})

// Custom timeout (5 seconds)
const response = await fetchWithTimeout('https://api.example.com/data', {
  timeout: 5000, // 5 seconds
  method: 'POST',
})

// JSON fetch with automatic parsing
const data = await fetchJSON<{ name: string }>('https://api.example.com/user', {
  timeout: 10000 // optional, defaults to 10000ms
})
```

**Standard timeout recommendations:**
- HubSpot: 8-10 seconds
- Mailchimp: 10 seconds
- Shopify: 10 seconds
- Turnstile verification: 5 seconds

### Metadata Helpers (metadata.ts)

Generate consistent metadata for SEO:

```typescript
import { generatePageMetadata, generateSanityMetadata } from '~/lib/metadata'

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
import { slugify, numberWithCommas, clamp, mapRange  } from '~/lib/utils'
import { useStore } from '~/lib/store'
import { validateEnv } from '~/lib/validate-env'
import { getRemovalGuide } from '~/lib/cleanup-integrations'
import { fetchWithTimeout } from '~/lib/fetch-with-timeout'
import { generatePageMetadata } from '~/lib/metadata'
```
