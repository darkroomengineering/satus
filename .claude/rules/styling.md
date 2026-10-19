---
paths:
  - '**/*.css'
  - 'components/**/*.tsx'
  - 'app/**/*.tsx'
  - 'lib/**/*.tsx'
---

# Styling

Satus styling rules that AGENTS.md does not carry. AGENTS.md owns the Styling split, the `@layer components` rule, oklch colors, and design tokens.

- Satus breaks some good-css.com rules on purpose: viewport-relative (`vw`) layout sizing through `dr-*` and `mobile-vw()` / `desktop-vw()`, `[data-theme]` attribute theming, and Lenis smooth scroll. Do not rewrite them toward the universal modern-CSS advice.
- Switch themes by overriding custom properties under `[data-theme]` (set on `<html>` by `components/layout/theme`), not with `light-dark()`.
- Import the global stylesheet once, in `app/layout.tsx`. Components never import it.
- Use Tailwind default values unless `lib/styles` defines the token. Never invent spacing, colors, or breakpoints when a default or a token suffices.
- Use `size-*` for square elements (`size-8`, not `w-8 h-8`).
- `text-balance` on headings, `text-pretty` on body text.
