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

| Component       | Purpose                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wrapper/`      | Page container with theme, Lenis, WebGL support. **Includes Header + Footer**                                                                             |
| `header/`       | Site navigation                                                                                                                                           |
| `footer/`       | Site footer                                                                                                                                               |
| `lenis/`        | Smooth scroll provider                                                                                                                                    |
| `theme/`        | Theme context provider                                                                                                                                    |
| `safari-edges/` | Fixed edge strips that run the page color behind mobile Safari's toolbars (`<Wrapper safariEdges>`), and the decoys that keep iOS 26+ Safari's bars clear |

## Wrapper Props

| Prop             | Type                         | Default  | Description                                                                                                                                                                                                                    |
| ---------------- | ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `theme`          | `'dark' \| 'light' \| 'red'` | `'dark'` | Color theme                                                                                                                                                                                                                    |
| `lenis`          | `boolean \| LenisOptions`    | `true`   | Smooth scrolling                                                                                                                                                                                                               |
| `webgl`          | `boolean`                    | `false`  | Enable WebGL canvas                                                                                                                                                                                                            |
| `className`      | `string`                     | -        | Additional classes for main                                                                                                                                                                                                    |
| `viewTransition` | `boolean`                    | `true`   | Crossfade main content between pages                                                                                                                                                                                           |
| `safariEdges`    | `boolean`                    | `false`  | Run the theme's primary color behind mobile Safari's status bar and bottom toolbar via `safari-edges/`. Use it only on pages whose top and bottom edges are one solid color, and keep the strips outside transformed ancestors |

## iOS 26+ Safari bars

iOS 26 Safari draws its status bar and toolbar clear, over the page. Observed in the iOS 27.2 simulator and on the iPhones tested for charge-cars-website#269:

- Safari paints a bar solid with the color of a full-width `position: fixed` (or stuck `sticky`) box it hit-tests mid-screen just inside that edge: a fixed header, a pinned section, an open overlay. `SafariBarDecoys` in `app/(site)/layout.tsx` covers those two points with 4×10px boxes, so the bars stay clear by default. Each decoy swallows taps on its 4×10px; keep tappable controls off the exact top and bottom center.
- Put `data-bar-tint` on a full-screen overlay while it is open (`AlertDialog` backdrop, Shopify cart). A closed overlay that stays mounted with `hidden` (`AlertDialog.Portal keepMounted`) does not count. The decoys step aside and both bars take the overlay's color. Without it, the page shows sharp under the bars beside the overlay.
- Safari draws a fixed box only between the bars. Negative `inset-block` does not reach under them; a `sticky` box does.
- At scroll 0 Safari shows `body`'s background behind the status bar, not the page's content.
- `100lvh` can end above the screen's bottom edge, and both safe-area insets read 0 without `viewportFit: 'cover'`. Media meant to fill the screen under the toolbar overflows its box by a fixed amount (64px on an iPhone 17 Pro Max).
- `@supports (-webkit-touch-callout: none) and (anchor-name: --a)` matches iOS 26+ WebKit, which includes Chrome and Firefox on iOS. Those draw their own bar above the page, so a style that must apply only to Safari also needs a user-agent check in a first-paint script.

## React 19.3 transitions

- `Wrapper` shares the `page-content` View Transition name across pages, so navigation crossfades only `<main>` for 150ms; header, footer, Lenis and the shared canvas stay outside that boundary. Use one Wrapper per page. `viewTransition={false}` opts a page out.
- Next.js 16 starts navigation transitions itself; no experimental flag or manual `document.startViewTransition()`. Unsupported browsers navigate normally.
- Global CSS keeps the transition to a 150ms opacity crossfade, which also runs under reduced motion because nothing moves, and lets pointer events through the overlay. Named snapshot participants can't be hit-tested during the animation, so keep them off rapidly repeated controls.
- The Sanity example wraps its async content in an update-only View Transition around Suspense: the fallback appears immediately and streamed content fades in. Content that does not suspend has no loading animation. Keep such boundaries inside the page's main content so they never capture the header or footer.
- Shared product image: wrap the existing `Image` in a named `ViewTransition` at both ends of the navigation, with a unique name per product. `Link` forwards Next's `transitionTypes` prop for directional styles. For local state changes use `startTransition`, optionally with `addTransitionType` to select animation classes; urgent input state stays immediate.
- View Transitions animate DOM snapshots, not WebGL scenes. Scroll entrances, timelines, pinning and hover feedback follow AGENTS.md § Animation.
