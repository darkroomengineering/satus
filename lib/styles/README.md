# Styles

Tailwind CSS v4 (CSS-first config via `@theme`), CSS Modules for complex or animated components, custom PostCSS functions, and `dr-*` utilities for viewport-relative sizing. The split and color rules are in AGENTS.md § Styling split and § Colors.

## Which tool for which job?

Reach for the lightest tool that does the job, in this order:

| Use…                   | When                                                                  | Example                                   |
| ---------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| **Tailwind utilities** | Layout, spacing, fl/grid, color, simple states. The default.          | `className="flex items-center gap-4 p-6"` |
| **`dr-*` utilities**   | Sizing that must **scale with the viewport** (px-perfect to a design) | `className="dr-w-150 dr-h-100"`           |
| **PostCSS fns in CSS** | Viewport/column math inside a CSS Module                              | `width: desktop-vw(320);`                 |
| **CSS Modules**        | Complex layouts, keyframes, pseudo-elements, deep specificity         | `import s from './x.module.css'`          |
| **Inline `style`**     | **Only** dynamic runtime values (a computed `--progress`)             | `style={{ '--p': pct } as CSSProperties}` |

Never hand-write spacing or colors Tailwind already gives you. Class order is sorted by `oxfmt` at format time, not by a lint rule.

## PostCSS functions

`mobile-vw(px)`, `mobile-vh(px)`, `desktop-vw(px)`, `desktop-vh(px)`: the given px value at the mobile or desktop design viewport, scaled with the viewport. `columns(n)`: n grid columns plus their gaps.

## Custom `dr-*` utilities

```tsx
<div className="dr-w-150 dr-h-100" />  {/* viewport-scaled width/height */}
<div className="dr-w-col-4" />          {/* 4 columns wide */}
<div className="dr-grid" />             {/* 4 cols mobile, 12 cols desktop */}
```

The full generated set is in `css/tailwind.css`.

## Breakpoints

`@media (--mobile)` is <= 799px; `@media (--desktop)` is >= 800px.

## Contrast

The `contrast` token (red in the shipped palette) is not body-text-safe on the
dark themes: APCA scores it ~Lc 32 against black even though WCAG 2 passes it.
Use it for accents, focus rings and display type only, not body copy. Run
`bun run contrast:accept` after rebranding to re-record the accepted baseline
for your palette.

## Design tokens

| Family | Source (edit this)                           | Notes                                                                                                                                                                                                                                                        |
| ------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Color  | `colors.ts` → `@theme` in `css/tailwind.css` | Raw palette (`--color-red`, `--color-blue`, …) plus theme-aware `--color-primary` / `--color-secondary` / `--color-contrast`, remapped per theme (`light`, `dark`, `red`). Tailwind v4 compiles `@theme` into `:root`, so there is no separate `:root` copy. |
| Easing | `css/easings.css` (hand-authored)            | `--ease-out-expo`, `--ease-in-out-cubic`, `--ease-gleasing`, … as a static `@theme` block. The only source of easing values: no JS twin, no copy in `css/tailwind.css`.                                                                                      |
| Layout | `layout.mjs` → `css/root.css`                | `--gap`, `--device-width`, and the column grid behind `columns()` and `dr-*-col-*`.                                                                                                                                                                          |

Set the active theme with the Theme wrapper (`<Wrapper theme="dark">`) and reference the semantic tokens; never hard-code a color in a component.

To add a token, edit the source config, run `bun setup:styles` (also run by `bun run build`), then use it as `var(--color-brand)` in CSS or `text-(--color-brand)` in Tailwind.

| File            | Purpose                                       |
| --------------- | --------------------------------------------- |
| `colors.ts`     | Color palette & per-theme semantic mapping    |
| `typography.ts` | Font sizes & weights                          |
| `layout.mjs`    | Grid, breakpoints, spacing, device widths     |
| `fonts.ts`      | Font loading                                  |
| `config.ts`     | Aggregates the above (imported as `@/config`) |

## Generated files — do not edit

`css/root.css` (layout custom properties) and `css/tailwind.css` (`@theme` + utilities)
are **generated** by `bun setup:styles`. Hand-edits are overwritten on the next run.

`css/easings.css` and `css/global.css` are **not generated**; edit them directly. `css/global.css` holds the `[data-reveal]` contract used by `useReveal` and the reduced-motion policy (movement transitions in `@media (--motion-ok)`, fades unconditional).

## Troubleshooting

- **Tokens missing, `dr-*` classes do nothing, or `mobile-vw()` left unparsed**: the generated CSS is stale. `bun dev` runs the generator in watch mode and `bun run build` runs it first; when the watcher isn't running (CI, a one-off script, a missed change), run `bun setup:styles`.
- **A token edit "didn't apply"**: confirm you changed the source in `lib/styles/*`, not the generated `css/*`, then re-run `bun setup:styles`.
- **Classes look unsorted**: run `bun run format` (or save with the oxc extension).
