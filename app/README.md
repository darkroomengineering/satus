# App Directory

Next.js App Router pages and routes.

## Structure

```
app/
├── layout.tsx            # Bare html/body shell shared with /studio
├── global-error.tsx      # Root-level error boundary (wraps html+body)
├── not-found.tsx         # Bare-shell 404 for routes outside (site), e.g. /studio
├── manifest.ts           # Web app manifest
├── robots.ts             # robots.txt
├── sitemap.ts            # sitemap.xml
├── llms.txt/             # /llms.txt route
├── agent-content/        # /agent-content route
├── icon.png, apple-icon.png, opengraph-image.jpg, twitter-image.jpg
├── (site)/               # Site routes with app providers; /studio, /api and the machine-readable routes live outside
│   ├── layout.tsx        # App providers, metadata, analytics
│   ├── page.tsx          # Manual / in-app documentation landing page
│   ├── loading.tsx       # App loading fallback
│   ├── error.tsx         # Error boundary (thin wrapper over components/ui/error-view)
│   ├── not-found.tsx     # 404 page
│   ├── ai/                # /ai route
│   ├── articles/[slug]/   # Sanity article pages
│   ├── [...slug]/         # Catch-all: renders one-segment Sanity pages by slug, 404 otherwise
│   └── (examples)/
│       └── sanity/       # Manual's Sanity tutorial route (kept on purpose)
├── api/
│   ├── cart/ensure/      # Shopify: idempotently ensures a cart cookie exists
│   ├── draft-mode/       # Sanity draft mode (enable/disable)
│   └── revalidate/       # Webhook endpoint
└── studio/               # Sanity Studio — inherits only the bare root shell
```

The root layout stays a bare shell on purpose: anything added to it is a
deliberate decision to ship it to `/studio` too. App-flavored concerns
(providers, metadata, analytics) belong in `app/(site)/layout.tsx`.

See [app/api/README.md](api/README.md) for the API surface (endpoints, webhook setup).

## Getting Started

**Use the interactive setup:**

```bash
bun run setup:project       # Choose what to keep/remove
```

Then:

1. Customize `(site)/page.tsx` for your homepage
2. Add routes as folders with `page.tsx` inside `(site)/`

## Page Pattern

```tsx
import { Wrapper } from '@/components/layout/wrapper'

export default function Page() {
  return (
    <Wrapper theme="dark" lenis webgl>
      <section>Your content</section>
    </Wrapper>
  )
}
```

**Wrapper Props:**

- `theme` — 'dark' | 'light' | 'red'
- `lenis` — Enable smooth scrolling
- `webgl` — Enable WebGL canvas

## Page-Specific Components

```
app/about/
├── page.tsx
└── _components/
    └── hero/
        └── index.tsx
```

## Best Practices

- Server Components by default
- Colocate page components in `_components/`
- Use route groups `(folder)` for organization
