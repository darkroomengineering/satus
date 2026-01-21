# App Directory

Next.js App Router pages and routes.

## Structure

```
app/
├── page.tsx              # Homepage (redirects to marketing)
├── layout.tsx            # Root layout
├── (marketing)/          # DELETE - Satūs marketing homepage
├── (examples)/           # DELETE - Demo pages (components, r3f, etc.)
├── api/
│   ├── draft-mode/       # Sanity draft mode
│   └── revalidate/       # Webhook endpoint
├── studio/               # Sanity Studio
├── loading.tsx           # Global loading
├── error.tsx             # Error boundary
└── not-found.tsx         # 404 page
```

## Getting Started

**Quick cleanup (manual):**
```bash
rm -rf "app/(examples)"     # Remove example pages (r3f, sanity, shopify, etc.)
rm -rf "app/(marketing)"    # Remove marketing homepage
```

**Or use the interactive setup:**
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
