# Layout Components

Site-wide layout structure: header, footer, and page wrapper.

## Architecture

```
app/layout.tsx          → Bare html/body shell shared with /studio
  └── app/(site)/layout.tsx → App providers (NO header/footer here)
  └── page.tsx        → Uses <Wrapper>
       └── Wrapper    → Contains Header + main + Footer
```

## Important

**The `<Wrapper>` component ALREADY includes `<Header>` and `<Footer>`.**

Do NOT add Header or Footer to:

- `app/layout.tsx` or `app/(site)/layout.tsx`
- Individual page files
- Nested layout files

They are automatically rendered when you use `<Wrapper>`.

## Components

| Component  | Purpose                                                                       |
| ---------- | ----------------------------------------------------------------------------- |
| `wrapper/` | Page container with theme, Lenis, WebGL support. **Includes Header + Footer** |
| `header/`  | Site navigation                                                               |
| `footer/`  | Site footer                                                                   |
| `lenis/`   | Smooth scroll provider                                                        |
| `theme/`   | Theme context provider                                                        |

## Usage

```tsx
// app/(site)/page.tsx
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

| Prop             | Type                         | Default  | Description                          |
| ---------------- | ---------------------------- | -------- | ------------------------------------ |
| `theme`          | `'dark' \| 'light' \| 'red'` | `'dark'` | Color theme                          |
| `lenis`          | `boolean \| LenisOptions`    | `true`   | Smooth scrolling                     |
| `webgl`          | `boolean`                    | `false`  | Enable WebGL canvas                  |
| `className`      | `string`                     | -        | Additional classes for main          |
| `viewTransition` | `boolean`                    | `true`   | Crossfade main content between pages |

## React 19.3 transitions

`Wrapper` shares the `page-content` View Transition name across pages. Navigation
crossfades only `<main>` for 150ms; header, footer, Lenis and the shared canvas
remain outside that boundary. Use one Wrapper per page. Pass
`viewTransition={false}` to opt a page out. The Sanity example wraps its async
content in an update-only View Transition around Suspense: its fallback appears
immediately, while streamed content can fade into place. Content that does not
suspend has no loading animation. Keep these boundaries inside the page's main
content so they never capture the header or footer.

Next.js 16.3 App Router starts navigation transitions automatically; no
experimental flag or manual `document.startViewTransition()` is needed.
Unsupported browsers navigate normally. Global CSS disables the transition
pseudo-element animations for reduced motion and lets pointer events through
the overlay. Named snapshot participants remain unavailable to hit-testing
during the short animation, so avoid using them for rapidly repeated controls.

For a shared product image, wrap the existing `Image` component in a named
`ViewTransition` at both ends of a navigation, with a unique name per product.
The `Link` wrapper forwards Next's `transitionTypes` prop for projects that
want directional styles. For local state changes, use `startTransition` and
optionally `addTransitionType` to
select different animation classes; urgent input state should stay immediate.

Keep scroll entrances on `useReveal`, timelines/pinning on GSAP, and hover
feedback on CSS transitions. View Transitions animate DOM snapshots and do
not animate WebGL scenes.
