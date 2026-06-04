# Styles

Hybrid styling for Satūs: **Tailwind CSS v4** (CSS-based config via `@theme`),
**CSS Modules** for complex/animated components, and custom **PostCSS functions**
+ **`dr-*` utilities** for viewport-relative responsive sizing.

## Which tool for which job?

Reach for the lightest tool that does the job. In rough order of preference:

| Use… | When | Example |
|------|------|---------|
| **Tailwind utilities** | Layout, spacing, fl/grid, color, simple states. The default. | `className="flex items-center gap-4 p-6"` |
| **`dr-*` utilities** | Sizing that must **scale with the viewport** (px-perfect to a design) | `className="dr-w-150 dr-h-100"` |
| **PostCSS fns in CSS** | Viewport/column math inside a CSS Module | `width: desktop-vw(320);` |
| **CSS Modules** | Complex layouts, keyframes, pseudo-elements, deep specificity | `import s from './x.module.css'` |
| **Inline `style`** | **Only** dynamic runtime values (a computed `--progress`) | `style={{ '--p': pct } as CSSProperties}` |

Rules of thumb: never hand-write spacing/colors Tailwind already gives you;
animate only `transform`/`opacity`; compose classes with `cn()` (from `clsx`),
and keep classes **sorted** (Biome enforces `useSortedClasses`).

## A component using all three

```tsx
import cn from 'clsx'
import type { ComponentProps } from 'react'
import s from './card.module.css'

interface CardProps extends ComponentProps<'article'> {
  featured?: boolean
}

export function Card({ featured = false, className, ...props }: CardProps) {
  return (
    <article
      // Tailwind atoms + dr-* responsive width + a CSS Module class (conditional)
      className={cn('flex flex-col gap-4', s.root, featured && s.isFeatured, className)}
      {...props}
    />
  )
}
```

```css
/* card.module.css — CamelCase class names, `s.root` import convention */
.root {
  width: desktop-vw(320);          /* PostCSS: 320px at the desktop viewport */
  padding: desktop-vw(24);
  background: var(--color-primary); /* design token (theme-aware) */
  border-radius: desktop-vw(8);
}

.isFeatured {
  border: 1px solid var(--color-contrast);
}
```

## PostCSS functions

```css
.element {
  width: mobile-vw(375);     /* 375px at the mobile viewport */
  height: desktop-vh(100);   /* 100px at the desktop viewport */
}
.sidebar {
  width: columns(3);         /* spans 3 grid columns + gaps */
}
```

Available: `mobile-vw()`, `mobile-vh()`, `desktop-vw()`, `desktop-vh()`, `columns(n)`.

## Custom `dr-*` utilities

```tsx
<div className="dr-w-150 dr-h-100" />  {/* viewport-scaled width/height */}
<div className="dr-w-col-4" />          {/* 4 columns wide */}
<div className="dr-grid" />             {/* 4 cols mobile, 12 cols desktop */}
```

See the generated `css/tailwind.css` for the full generated set.

## Breakpoints

```css
@media (--mobile)  { /* <= 799px */ }
@media (--desktop) { /* >= 800px (desktop breakpoint) */ }
```

## Design tokens

Tokens are generated into `css/root.css` as CSS custom properties and exposed to
Tailwind via the `@theme` directive in `css/tailwind.css`. Key families:

- **Color** — raw palette (`--color-red`, `--color-blue`, …) plus **theme-aware**
  `--color-primary` / `--color-secondary` / `--color-contrast`, which are remapped
  per theme (`light`, `dark`, `evil`, `red`). Set the active theme via the Theme
  wrapper (e.g. `<Wrapper theme="dark">`), then reference the semantic tokens —
  never hard-code a hex in a component.
- **Easing** — `--ease-out-expo`, `--ease-in-out-cubic`, `--ease-gleasing`, … for
  `transition`/`animation` timing functions.
- **Layout** — `--gap`, `--device-width`, and the column grid that powers
  `columns()` and `dr-*-col-*`.

## Adding a design token

Edit the **source** config (never the generated CSS), then regenerate:

```bash
# 1. Add the value — e.g. a new brand color in lib/styles/colors.ts
#    colors = { ..., brand: '#ff5c00' }
# 2. Regenerate root.css + tailwind.css from the config
bun setup:styles
# 3. Use it
#    CSS:      color: var(--color-brand);
#    Tailwind: className="text-(--color-brand)"
```

| File | Purpose |
|------|---------|
| `colors.ts` | Color palette & per-theme semantic mapping |
| `typography.ts` | Font sizes & weights |
| `layout.mjs` | Grid, breakpoints, spacing, device widths |
| `easings.ts` | Animation curves |
| `fonts.ts` | Font loading |
| `config.ts` | Aggregates the above (imported as `@/config`) |

## Generated files — do not edit

`css/root.css` (custom properties) and `css/tailwind.css` (`@theme` + utilities)
are **generated** by `bun setup:styles`. Hand-edits are overwritten on the next run.

`css/global.css` is **not generated** — it houses the `[data-reveal]` reveal-animation contract (used by `useReveal`) and the global `prefers-reduced-motion` neutralizer. Edit it directly when adjusting global animation defaults.

## Troubleshooting

- **Tokens missing / `var(--color-*)` resolves to nothing, `dr-*` classes do nothing, or `mobile-vw()` is left unparsed** — the generated CSS is stale. `bun dev` runs the generator in **watch mode** and `bun run build` runs it first, so this normally self-heals; if the watcher isn't running (CI, a one-off script, or it didn't pick up a change), regenerate manually with `bun setup:styles`.
- **A token edit "didn't apply"** — confirm you changed the source in `lib/styles/*`, not the generated `css/*`, then re-run `bun setup:styles`.
- **Unsorted-class lint error** — let Biome fix it: `bun lint:fix`.
