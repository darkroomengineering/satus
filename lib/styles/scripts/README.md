# Style Generation Scripts

Generate CSS from the TypeScript config in `lib/styles/` (`colors.ts`, `typography.ts`, etc.). Run `bun setup:styles` after every config change; `bun dev` watches and `bun run build` runs it first. Never edit `css/root.css` or `css/tailwind.css` directly.

| Script                  | Output                           |
| ----------------------- | -------------------------------- |
| `setup-styles.ts`       | Orchestrates all generation      |
| `generate-root.ts`      | → `css/root.css`                 |
| `generate-tailwind.ts`  | → `css/tailwind.css`             |
| `generate-scale.ts`     | Scale utilities                  |
| `postcss-functions.mjs` | `mobile-vw()`, `columns()`, etc. |
