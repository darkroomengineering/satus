# App Directory

Next.js App Router pages and routes.

## Structure

```
app/
├── layout.tsx            # Bare html/body shell shared with /studio
├── global-error.tsx      # Root-level error boundary (wraps html+body)
├── (site)/               # Every route EXCEPT /studio lives in this group
│   ├── layout.tsx        # App providers, metadata, analytics
│   ├── page.tsx          # Manual / in-app documentation landing page
│   ├── loading.tsx       # App loading fallback
│   ├── error.tsx         # Error boundary (thin wrapper over components/ui/error-view)
│   ├── not-found.tsx     # 404 page
│   └── [...unmatched]/   # Catch-all routing unmatched URLs to the 404 above
├── api/
│   ├── draft-mode/       # Sanity draft mode
│   └── revalidate/       # Webhook endpoint
└── studio/               # Sanity Studio — inherits only the bare root shell
```

The root layout stays a bare shell on purpose: anything added to it is a
deliberate decision to ship it to `/studio` too. App-flavored concerns
(providers, metadata, analytics) belong in `app/(site)/layout.tsx`.

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

- `theme` — 'dark' | 'light' | 'red' | 'evil'
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
