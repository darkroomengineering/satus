# App Directory

Next.js App Router pages, layouts, and API routes.

## Structure

```
app/
├── (pages)/               # Page routes (grouped)
│   ├── _components/     # Shared page components
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

**`_components`** - Shared components for pages
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
// app/(pages)/example/_components/interactive.tsx
'use client'

export function InteractiveComponent() {
  const [state, setState] = useState()
  return <div onClick={() => setState(...)}>...</div>
}
```

## Wrapper Component

The `wrapper/` component provides common layout:

```tsx
import { Wrapper } from '~/app/(pages)/_components/wrapper'

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
- **Colocation** - Keep page-specific components in `_components/` folder
- **Shared Components** - Move to `/components` if used across pages
- **Route Groups** - Use `(folder)` syntax to organize without affecting URLs
- **Dynamic Routes** - Use `[param]` for dynamic segments
- **Loading States** - Add `loading.tsx` to routes with data fetching
- **Error Handling** - Add `error.tsx` to routes that might fail

## Cache Components (Next.js 16)

Cache Components are enabled globally (`cacheComponents: true` in `next.config.ts`). See the [root README](../../README.md#cache-components-gotchas) for comprehensive gotchas and best practices.

**Quick Reference:**
- Wrap cached components in Suspense boundaries
- Use `cache: 'no-store'` for user-specific data
- Use `revalidateTag()` or `revalidatePath()` for cache invalidation

## Related Documentation

- [Next.js App Router](https://nextjs.org/docs/app)
- [Components](../components/README.md)
- [Integrations](../integrations/README.md)

