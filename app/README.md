# App Directory

Next.js App Router pages and routes.

## Structure

```
app/
├── page.tsx              # Manual / in-app documentation landing page
├── layout.tsx            # Root layout
├── api/
│   ├── draft-mode/       # Sanity draft mode
│   └── revalidate/       # Webhook endpoint
├── loading.tsx           # Global loading
├── error.tsx             # Error boundary (thin wrapper over components/ui/error-view)
├── global-error.tsx      # Root-level error boundary (wraps html+body)
└── not-found.tsx         # 404 page
```

## Getting Started

**Use the interactive setup:**
```bash
bun run setup:project       # Choose what to keep/remove
```

Then:
1. Customize `page.tsx` for your homepage
2. Add routes as folders with `page.tsx`

## Page Pattern

```tsx
import { Wrapper } from '@/components/layout'

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
