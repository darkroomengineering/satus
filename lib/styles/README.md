# Styles

Hybrid styling with Tailwind CSS v4 and custom PostCSS functions.

## PostCSS Functions

```css
/* Viewport-relative sizing */
.element {
  width: mobile-vw(375);    /* 375px at mobile viewport */
  height: desktop-vh(100);  /* 100px at desktop viewport */
}

/* Grid columns */
.sidebar {
  width: columns(3);        /* Spans 3 columns + gaps */
}
```

## Custom Utilities (`dr-*`)

```tsx
// Responsive sizing (scales with viewport)
<div className="dr-w-150 dr-h-100" />

// Column-based sizing
<div className="dr-w-col-4" />  {/* 4 columns wide */}

// Grid layout
<div className="dr-grid" />     {/* 4 cols mobile, 12 cols desktop */}
```

## Breakpoints

```css
@media (--mobile) { /* <= 799px */ }
@media (--desktop) { /* >= 800px */ }
```

## Configuration

| File | Purpose |
|------|---------|
| `colors.ts` | Color palette & themes |
| `typography.ts` | Font sizes & weights |
| `layout.mjs` | Grid, breakpoints, spacing |
| `easings.ts` | Animation curves |
| `fonts.ts` | Font loading |

After changing config: `bun setup:styles`

## Generated Files (Don't Edit)

- `css/root.css` — CSS custom properties
- `css/tailwind.css` — Tailwind utilities

Run `bun setup:styles` to regenerate after config changes.
