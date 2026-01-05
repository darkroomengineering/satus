# App Directory

Next.js App Router pages, layouts, and API routes.

## Structure

```
app/
├── page.tsx              # Homepage
├── layout.tsx            # Root layout (providers, fonts, styles)
├── (examples)/           # 🗑️ DELETE THIS FOLDER to clean template
│   ├── r3f/              # React Three Fiber demo
│   ├── sanity/           # Sanity CMS pages
│   ├── shopify/          # Shopify e-commerce pages
│   └── hubspot/          # HubSpot demo page
├── api/                  # API routes
│   ├── draft-mode/       # Sanity draft mode toggle
│   └── revalidate/       # Webhook revalidation endpoint
├── studio/               # Sanity Studio
├── loading.tsx           # Global loading state
├── error.tsx             # Error boundary
├── not-found.tsx         # 404 page
└── manifest.ts           # PWA manifest
```

## Getting Started

### 1. Clean Template (When Starting New Project)

```bash
# Delete all example pages
rm -rf app/(examples)
```

Then customize `/app/page.tsx` and `/components/layout/navigation` for your project.

### 2. Add New Pages

Create new routes directly in `/app`:

```
app/
├── page.tsx          # Homepage
├── about/
│   └── page.tsx      # /about
├── blog/
│   ├── page.tsx      # /blog
│   └── [slug]/
│       └── page.tsx  # /blog/[slug]
```

### 3. Page-Specific Components

For page-specific components, use `_components` folder inside the route:

```
app/
└── about/
    ├── page.tsx
    └── _components/
        └── team-section/
            └── index.tsx
```

## Key Files

**`layout.tsx`** - Root layout
- Imports global styles
- Sets up fonts, metadata, viewport
- Includes global providers (RealViewport, GSAPRuntime, ReactTempus)
- Loads Orchestra debug tools (dev only)

**`page.tsx`** - Homepage
- Uses the `Wrapper` component from `~/components/layout`
- Customize this for your project's homepage

**`loading.tsx`** - Global loading UI
- Shows during page transitions
- Can be overridden at route level

**`error.tsx`** - Error boundary
- Catches and displays errors gracefully
- Provides retry functionality

## Page Pattern

```tsx
import { Wrapper } from '~/components/layout/wrapper'

export default function Page() {
  return (
    <Wrapper 
      theme="dark" 
      lenis={true} 
      webgl={{ postprocessing: true }}
    >
      {/* Your page content */}
    </Wrapper>
  )
}
```

**Wrapper Props:**
- `theme` - Color theme ('dark' | 'light' | 'red')
- `lenis` - Enable smooth scrolling (boolean or config object)
- `webgl` - Enable WebGL canvas (boolean or config object)

## API Routes

**`/api/draft-mode/enable`** / **`/api/draft-mode/disable`**
- Toggle Sanity draft mode

**`/api/revalidate`**
- Webhook endpoint for content revalidation
- Used by Sanity and Shopify

## Examples Folder

The `(examples)` folder contains demo pages showcasing integrations:

| Route | Demo |
|-------|------|
| `/r3f` | React Three Fiber + Theatre.js |
| `/sanity` | Sanity CMS content |
| `/shopify` | E-commerce product + cart |
| `/hubspot` | Form integration |

**Delete this folder** when starting a real project - it's only for reference.

## Best Practices

- **Use Server Components by default** - Only use `'use client'` when needed
- **Colocation** - Keep page-specific components in `_components/` folder
- **Shared Components** - Use `~/components` for reusable UI
- **Route Groups** - Use `(folder)` syntax to organize without affecting URLs
- **Dynamic Routes** - Use `[param]` for dynamic segments

## Related Documentation

- [Components](../components/README.md)
- [Lib (hooks, integrations, utils)](../lib/README.md)
- [Next.js App Router](https://nextjs.org/docs/app)
