# CSS System

Hybrid styling: Tailwind CSS v4 + custom PostCSS functions + code-generated utilities.

## How It Works

```
TypeScript Config  -->  setup:styles  -->  Generated CSS  -->  PostCSS Pipeline  -->  Browser
(colors.ts, etc.)       (bun script)      (root.css,          (Tailwind v4,
                                           tailwind.css)       PostCSS functions)
```

**Config files are the source of truth.** Never edit `css/root.css` or `css/tailwind.css` directly — they are generated.

## Quick Start

```bash
# After changing any config file:
bun setup:styles

# This runs automatically during `bun dev` and `bun run build`
```

## Configuration Files

| File | Purpose | Example |
|------|---------|---------|
| `layout.mjs` | Grid, breakpoints, screen sizes | Columns: 4 mobile / 12 desktop, gap: 16px |
| `colors.ts` | Color palette + semantic themes | light/dark/evil/red themes |
| `typography.ts` | Named type styles with responsive sizes | Generates `@utility` classes |
| `easings.ts` | Named easing curves (19 presets) | `--easing-in-out-expo`, etc. |
| `fonts.ts` | Next.js font loading | `localFont` with CSS variable |

> **`layout.mjs` must stay `.mjs`** — PostCSS consumes it directly and cannot import TypeScript.

## Breakpoints

One breakpoint: **800px**. Mobile-first.

```css
/* In CSS Modules */
@media (--mobile)  { /* width <= 799px */ }
@media (--desktop) { /* width >= 800px */ }
```

```tsx
{/* In Tailwind classes — dt: prefix for desktop */}
<div className="dr-w-100 dt:dr-w-200" />
```

Standard Tailwind breakpoints (`sm:`, `md:`, `lg:`) are disabled. Only `dt:` exists.

## The `dr-*` Utilities

Viewport-scaling utilities that match design mockup pixels exactly.

### How the Math Works

The integer is **design pixels** — the value from your Figma/Sketch mockup:

```
dr-w-150  →  calc((150 * 100) / var(--device-width) * 1vw)

Mobile (375px design):  150/375 = 40vw
Desktop (1440px design): 150/1440 = 10.42vw
```

The switch happens automatically because `--device-width` changes at the 800px breakpoint.

### Available Properties

**Sizing & spacing:** `w`, `min-w`, `max-w`, `h`, `min-h`, `max-h`, `gap`, `gap-x`, `gap-y`, `p`, `px`, `py`, `pt`, `pr`, `pb`, `pl`, `m`, `mx`, `my`, `mt`, `mr`, `mb`, `ml`

**Positioning:** `top`, `right`, `bottom`, `left`, `inset`, `inset-x`, `inset-y`

**Text:** `text` (font-size), `tracking` (letter-spacing), `leading` (line-height)

**Borders:** `border`, `rounded` (all sides/corners)

**Negatives:** Prefix with `-` → `-dr-mt-20`

### Column-Based Utilities

Span grid columns including inter-column gaps:

```tsx
<div className="dr-w-col-4" />
{/* = calc((4 * var(--column-width)) + ((4 - 1) * var(--gap))) */}
```

Available for all sizing/spacing/positioning properties above.

### Layout Utilities

```tsx
<div className="dr-grid" />           {/* 4-col mobile, 12-col desktop grid */}
<div className="dr-layout-grid" />    {/* Full-width grid with safe area padding */}
<div className="dr-layout-block" />   {/* Block layout with safe area padding */}
<div className="desktop-only" />      {/* Hidden on mobile */}
<div className="mobile-only" />       {/* Hidden on desktop */}
```

### No IDE Autocomplete

The `dr-*` utilities use Tailwind v4's parametric `@utility` syntax. IDE plugins have limited support for these. The `dr-w-px` variants serve as autocomplete anchors — they hint that the `dr-w-` prefix exists.

## PostCSS Functions

Used **only in CSS Modules** (not in Tailwind class strings):

| Function | What It Does | Example Output |
|----------|-------------|----------------|
| `mobile-vw(150)` | 150px at 375px design width | `40vw` |
| `mobile-vh(100)` | 100px at 650px design height | `clamp(15.38vh, 15.38svh, 15.38dvh)` |
| `desktop-vw(100)` | 100px at 1440px design width | `6.944vw` |
| `desktop-vh(100)` | 100px at 816px design height | `12.254svh` |
| `columns(3)` | Span 3 columns + gaps | `calc((3 * var(--column-width)) + (2 * var(--gap)))` |

```css
/* component.module.css */
.element {
  padding: mobile-vw(16);

  @media (--desktop) {
    padding: desktop-vw(16);
  }
}
```

## Theming

Four built-in themes driven by `data-theme` attribute on `<html>`:

| Theme | Primary | Secondary | Contrast |
|-------|---------|-----------|----------|
| `light` | white | black | red |
| `dark` | black | white | red |
| `evil` | black | red | white |
| `red` | red | black | white |

```tsx
// In components
import { useTheme } from '@/components/layout/theme'
const { theme, setTheme } = useTheme()

// Theme-scoped Tailwind variants
<div className="light:bg-white dark:bg-black" />
```

Edit themes in `colors.ts` → run `bun setup:styles`.

## Three Styling Patterns

### Pattern A: Pure Tailwind (simple layouts)

```tsx
<div className="dr-px-16 dr-py-12 dt:dr-px-24 dt:dr-py-16 flex items-center gap-2">
  <span className="dr-text-14 dt:dr-text-16">Hello</span>
</div>
```

### Pattern B: CSS Modules + PostCSS functions (complex components)

```css
/* switch.module.css */
.root {
  width: mobile-vw(44);
  height: mobile-vw(24);

  @media (--desktop) {
    width: desktop-vw(44);
    height: desktop-vw(24);
  }
}
```

```tsx
import s from './switch.module.css'
<div className={s.root} />
```

### Pattern C: Combined (most common)

```tsx
import cn from 'clsx'
import s from './hero.module.css'

// CSS Modules for complex styling, Tailwind for layout
<section className={cn(s.hero, 'dr-layout-grid')}>
  <div className={cn(s.content, 'col-span-full dt:col-start-3 dt:col-end-11')}>
```

**Convention:** CSS Modules handle animations, transitions, pseudo-elements. Tailwind handles layout and simple responsive overrides. Combine with `cn()` from `clsx`.

## CSS Custom Properties

Available globally (generated into `root.css`):

```css
/* Layout */
var(--device-width)    /* 375 mobile, 1440 desktop */
var(--device-height)   /* 650 mobile, 816 desktop */
var(--columns)         /* 4 mobile, 12 desktop */
var(--gap)             /* 16px scaled to viewport */
var(--safe)            /* 16px safe area */
var(--column-width)    /* Calculated from above */
var(--header-height)   /* Set by header component */

/* Colors (swap with theme) */
var(--color-primary)
var(--color-secondary)
var(--color-contrast)

/* Easings */
var(--easing-in-out-expo)  /* ... and 18 more */
```

## Common Recipes

### Change a color

1. Edit `colors.ts` — modify `rawColors` or `themes`
2. Run `bun setup:styles`
3. Colors update everywhere via CSS custom properties

### Change the grid

1. Edit `layout.mjs` — modify `columns`, `gap`, or `safe`
2. Run `bun setup:styles`
3. Grid utilities and CSS variables update automatically

### Change screen sizes

1. Edit `layout.mjs` — modify `screens.mobile.width` or `screens.desktop.width`
2. Run `bun setup:styles`
3. All `dr-*` utilities and PostCSS functions recalculate

### Add a typography style

1. Edit `typography.ts` — add entry with mobile/desktop sizes
2. Run `bun setup:styles`
3. New `@utility` class is available in Tailwind

## Generated Files (Don't Edit)

| File | Generated By |
|------|-------------|
| `css/root.css` | `generate-root.ts` — CSS custom properties + media queries |
| `css/tailwind.css` | `generate-tailwind.ts` + `generate-scale.ts` — theme, utilities, `dr-*` |

Both have a `/* THIS FILE IS GENERATED */` banner. Regenerate: `bun setup:styles`
