# App Directory

Next.js App Router pages, layouts, and API routes.

## Structure

```
app/
├── (pages)/               # Page routes (grouped)
│   ├── (components)/     # Shared page components
│   │   ├── footer/       # Site footer
│   │   ├── lenis/        # Smooth scroll provider
│   │   ├── navigation/   # Site navigation
│   │   ├── theme/        # Theme provider
│   │   └── wrapper/      # Page wrapper (combines theme, lenis, webgl)
│   ├── home/             # Homepage (/home → rewritten to /)
│   ├── hubspot/          # HubSpot demo page
│   ├── r3f/              # React Three Fiber demo
│   ├── sanity/           # Sanity CMS pages
│   │   └── [slug]/       # Dynamic article pages
│   └── shopify/          # Shopify e-commerce pages
│       └── account/      # Customer account
├── api/                  # API routes
│   ├── draft-mode/       # Sanity draft mode toggle
│   │   ├── enable/
│   │   └── disable/
│   └── revalidate/       # Webhook revalidation endpoint
├── studio/               # Sanity Studio
│   └── [[...tool]]/
├── layout.tsx            # Root layout
├── loading.tsx           # Global loading state
├── error.tsx             # Error boundary
├── global-error.tsx      # Critical error boundary
├── manifest.ts           # PWA manifest
├── robots.ts             # Robots.txt
└── actions.ts            # Server actions
```

## Route Groups

**`(pages)`** - Route group for pages (doesn't affect URL structure)
- Allows shared layout/components without affecting URLs
- Contains all main pages of the site

**`(components)`** - Shared components for pages
- Used across multiple pages
- Includes layout wrappers, navigation, footer

## Key Files

**`layout.tsx`** - Root layout
- Imports global styles
- Sets up fonts, metadata, viewport
- Includes global providers (RealViewport, GSAPRuntime, ReactTempus)
- Conditionally loads Sanity visual editing in draft mode
- Loads Orchestra debug tools (dev only)

**`loading.tsx`** - Global loading UI
- Shows during page transitions
- Can be overridden at route level

**`error.tsx`** - Error boundary
- Catches and displays errors gracefully
- Provides retry functionality

**`global-error.tsx`** - Critical error handler
- Fallback for layout.tsx errors
- Must include `<html>` and `<body>`

## API Routes

**`/api/draft-mode/enable`**
- Enables Sanity draft mode
- Sets draft mode cookie
- Redirects to preview URL

**`/api/draft-mode/disable`**
- Disables Sanity draft mode
- Clears draft mode cookie
- Redirects to current page

**`/api/revalidate`**
- Webhook endpoint for content revalidation
- Used by Sanity and Shopify
- Requires secret parameter

## Page Components Pattern

**Server Components (Default)**
```tsx
// app/(pages)/example/page.tsx
export default async function ExamplePage() {
  const data = await fetchData()
  return <ExampleComponent data={data} />
}
```

**Client Components (When Needed)**
```tsx
// app/(pages)/example/(components)/interactive.tsx
'use client'

export function InteractiveComponent() {
  const [state, setState] = useState()
  return <div onClick={() => setState(...)}>...</div>
}
```

## Wrapper Component

The `wrapper/` component provides common layout:

```tsx
import { Wrapper } from '~/app/(pages)/(components)/wrapper'

export default function Page() {
  return (
    <Wrapper 
      theme="dark" 
      lenis={true} 
      webgl={{ postprocessing: true }}
    >
      {/* Page content */}
    </Wrapper>
  )
}
```

**Props:**
- `theme` - Color theme ('dark' | 'light')
- `lenis` - Enable smooth scrolling (boolean or config object)
- `webgl` - Enable WebGL canvas (boolean or config object)

## URL Rewrites

Configured in `next.config.ts`:

- `/` → rewrites to `/home`
- `/home` → redirects to `/` (permanent)

## Best Practices

- **Use Server Components by default** - Only use `'use client'` when needed
- **Colocation** - Keep page-specific components in `(components)/` folder
- **Shared Components** - Move to `/components` if used across pages
- **Route Groups** - Use `(folder)` syntax to organize without affecting URLs
- **Dynamic Routes** - Use `[param]` for dynamic segments
- **Loading States** - Add `loading.tsx` to routes with data fetching
- **Error Handling** - Add `error.tsx` to routes that might fail

## Cache Components (Next.js 16)

Cache Components are enabled globally (`cacheComponents: true` in `next.config.ts`). This provides advanced caching strategies for Server Components.

### Important Gotchas

**1. Suspense Boundaries Required**
```tsx
import { Suspense } from 'react'

export default async function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CachedComponent />
    </Suspense>
  )
}
```

**2. Server Components Only**
- Cache Components work only in Server Components
- Client Components (`'use client'`) cannot use Cache Components
- Move data fetching to Server Components, pass props to Client Components

**3. User-Specific Data**
- ❌ **Never cache** personalized data (user profiles, cart contents, private content)
- ✅ **Always use** `cache: 'no-store'` for user-specific requests
- Example: User shopping carts should never be cached

**4. Real-Time Data**
```tsx
// ❌ DON'T: Cache real-time data
const data = await fetch('https://api.example.com/live-prices')

// ✅ DO: Opt out of caching
const data = await fetch('https://api.example.com/live-prices', {
  cache: 'no-store'
})
```

**5. Testing Caching**
- **Hard Refresh** (`Cmd+Shift+R` / `Ctrl+Shift+R`) bypasses router cache
- **Navigation** uses router cache
- Test both behaviors to understand caching
- Development and production behave differently

**6. Cache Invalidation**
```tsx
import { revalidateTag, revalidatePath } from 'next/cache'

// Invalidate by tag
revalidateTag('products')

// Invalidate by path
revalidatePath('/products/[slug]')
```

**7. Dynamic Routes**
- Dynamic routes (`[slug]`) require careful cache tag management
- Use `next: { tags: [...] }` in fetch options
- Invalidate specific routes with `revalidatePath('/products/[slug]', 'page')`

## Related Documentation

- [Next.js App Router](https://nextjs.org/docs/app)
- [Components](../components/README.md)
- [Integrations](../integrations/README.md)

