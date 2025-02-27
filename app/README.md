# Next.js App Router

This directory contains the Next.js application pages and routes using the App Router architecture. It implements React Server Components (RSC) for optimal performance and progressive enhancement.

## Directory Structure

- `(pages)/` - Page components and layouts grouped by route
  - `(components)/` - Components specific to these pages
  - `home/` - Homepage route
  - `storyblok/` - Storyblok CMS routes
  - `shopify/` - E-commerce routes
  - `hubspot/` - HubSpot integration routes
  - `r3f/` - React Three Fiber demonstration routes
- `api/` - API routes and server-side functions
  - `draft/` - Draft mode API for CMS preview
  - `revalidate/` - Cache revalidation endpoints
- `layout.tsx` - Root layout component
- `manifest.ts` - Web app manifest
- `opengraph-image.tsx` - OpenGraph image generation
- `robots.ts` - Robots.txt configuration
- `twitter-image.ts` - Twitter card image generation

## Key Features

- React Server Components for improved performance
- Streaming and progressive rendering
- Static and dynamic routes with optimized data fetching
- Route groups for organization (parentheses folders)
- API endpoints for server-side operations
- SEO optimization with metadata
- Integration with CMS and e-commerce platforms

## Route Groups

Route groups (folders with parentheses) don't affect the URL path but help organize related routes:

```
(pages)/             # Not part of URL path
  (components)/      # Shared components for these routes
  home/              # Route: /
  storyblok/         # Route: /storyblok
    [slug]/          # Dynamic route: /storyblok/[any-slug]
```

## Page Structure

Each page is a React component that can be a Server Component by default:

```tsx
// app/(pages)/example/page.tsx
export default function ExamplePage() {
  // This is a React Server Component by default
  return (
    <main>
      <h1>Example Page</h1>
      <ClientComponent />
    </main>
  )
}
```

For client-side interactivity, use the 'use client' directive:

```tsx
// app/(pages)/(components)/ClientComponent.tsx
'use client'

import { useState } from 'react'

export default function ClientComponent() {
  const [count, setCount] = useState(0)
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}
```

## API Routes

API routes are server-side functions that handle HTTP requests:

```tsx
// app/api/example/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  return NextResponse.json({ message: 'Hello World' })
}

export async function POST(request: Request) {
  const data = await request.json()
  // Process data...
  return NextResponse.json({ success: true, data })
}
```

## Best Practices

1. **Performance**
   - Use React Server Components when possible
   - Implement proper error and loading states
   - Leverage streaming for improved UX

2. **Data Fetching**
   - Use server components for data fetching
   - Cache responses appropriately
   - Implement revalidation strategies

3. **Organization**
   - Group related routes with route groups
   - Co-locate page-specific components
   - Follow the Next.js file conventions
   
4. **SEO**
   - Use metadata API for SEO optimization
   - Generate OpenGraph images
   - Configure robots.txt appropriately 