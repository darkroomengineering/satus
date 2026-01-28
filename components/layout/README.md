# Layout Components

Site-wide layout structure: header, footer, and page wrapper.

## Architecture

```
app/layout.tsx        → Root HTML shell (NO header/footer here)
  └── page.tsx        → Uses <Wrapper>
       └── Wrapper    → Contains Header + main + Footer
```

## Important

**The `<Wrapper>` component ALREADY includes `<Header>` and `<Footer>`.**

Do NOT add Header or Footer to:
- `app/layout.tsx`
- Individual page files
- Nested layout files

They are automatically rendered when you use `<Wrapper>`.

## Components

| Component | Purpose |
|-----------|---------|
| `wrapper/` | Page container with theme, Lenis, WebGL support. **Includes Header + Footer** |
| `header/` | Site navigation |
| `footer/` | Site footer |
| `lenis/` | Smooth scroll provider |
| `theme/` | Theme context provider |

## Usage

```tsx
// app/page.tsx
import { Wrapper } from '@/components/layout/wrapper'

export default function Page() {
  return (
    <Wrapper theme="dark">
      {/* Header and Footer are automatic */}
      <section>Your content here</section>
    </Wrapper>
  )
}
```

## Customizing Header/Footer

Edit these files directly:
- `components/layout/header/index.tsx`
- `components/layout/footer/index.tsx`

## Wrapper Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `'dark' \| 'light' \| 'red'` | `'dark'` | Color theme |
| `lenis` | `boolean \| LenisOptions` | `true` | Smooth scrolling |
| `webgl` | `boolean` | `false` | Enable WebGL canvas |
| `className` | `string` | - | Additional classes for main |
