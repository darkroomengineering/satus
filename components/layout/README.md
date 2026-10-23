# Layout Components

Site-wide layout structure: header, footer, and page wrapper.

## Architecture

```
app/layout.tsx          → Bare html/body shell shared with /studio
  └── app/(site)/layout.tsx → App providers (NO header/footer here)
  └── page.tsx        → Uses <Wrapper>
       └── Wrapper    → Contains Header + main + Footer
```

**`<Wrapper>` already renders `<Header>` and `<Footer>`.** Never add them to `app/layout.tsx`, `app/(site)/layout.tsx`, nested layouts, or page files. Customize them in `components/layout/header/index.tsx` and `components/layout/footer/index.tsx`.

## Components

| Component       | Purpose                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `wrapper/`      | Page container with theme, Lenis, WebGL support. **Includes Header + Footer**                       |
| `header/`       | Site navigation                                                                                     |
| `footer/`       | Site footer                                                                                         |
| `lenis/`        | Smooth scroll provider                                                                              |
| `theme/`        | Theme context provider                                                                              |
| `safari-edges/` | Fixed edge strips that run the page color behind mobile Safari's toolbars (`<Wrapper safariEdges>`) |

## Wrapper Props

| Prop             | Type                         | Default  | Description                          |
| ---------------- | ---------------------------- | -------- | ------------------------------------ |
| `theme`          | `'dark' \| 'light' \| 'red'` | `'dark'` | Color theme                          |
| `lenis`          | `boolean \| LenisOptions`    | `true`   | Smooth scrolling                     |
| `webgl`          | `boolean`                    | `false`  | Enable WebGL canvas                  |
| `className`      | `string`                     | -        | Additional classes for main          |
| `viewTransition` | `boolean`                    | `true`   | Crossfade main content between pages |

## React 19.3 transitions

- `Wrapper` shares the `page-content` View Transition name across pages, so navigation crossfades only `<main>` for 150ms; header, footer, Lenis and the shared canvas stay outside that boundary. Use one Wrapper per page. `viewTransition={false}` opts a page out.
- Next.js 16.3 starts navigation transitions itself; no experimental flag or manual `document.startViewTransition()`. Unsupported browsers navigate normally.
- Global CSS keeps the transition to a 150ms opacity crossfade, which also runs under reduced motion because nothing moves, and lets pointer events through the overlay. Named snapshot participants can't be hit-tested during the animation, so keep them off rapidly repeated controls.
- The Sanity example wraps its async content in an update-only View Transition around Suspense: the fallback appears immediately and streamed content fades in. Content that does not suspend has no loading animation. Keep such boundaries inside the page's main content so they never capture the header or footer.
- Shared product image: wrap the existing `Image` in a named `ViewTransition` at both ends of the navigation, with a unique name per product. `Link` forwards Next's `transitionTypes` prop for directional styles. For local state changes use `startTransition`, optionally with `addTransitionType` to select animation classes; urgent input state stays immediate.
- View Transitions animate DOM snapshots, not WebGL scenes. Scroll entrances, timelines, pinning and hover feedback follow AGENTS.md § Animation.
