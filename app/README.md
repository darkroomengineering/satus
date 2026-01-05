# App Directory

Next.js App Router pages and routes.

## Structure

```
app/
├── page.tsx              # Homepage
├── layout.tsx            # Root layout
├── (examples)/           # DELETE when starting real project
├── api/
│   ├── draft-mode/       # Sanity draft mode
│   └── revalidate/       # Webhook endpoint
├── studio/               # Sanity Studio
├── loading.tsx           # Global loading
├── error.tsx             # Error boundary
└── not-found.tsx         # 404 page
```

## Getting Started

1. Delete `(examples)/` folder
2. Customize `page.tsx`
3. Add routes as folders with `page.tsx`

## Page Pattern

```tsx
import { Wrapper } from '~/components/layout'

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
