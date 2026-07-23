# Figma → repo token sync

Design authors tokens as **Figma Variables**; this pipeline pulls them into the
repo's source config, which the existing style generator turns into CSS. Figma
is the source of truth for the palette, themes, and grid. One conversion step
(sRGB → `oklch()`) happens on import, because this repo authors all color in
`oklch`.

```
Figma Variables ──export──▶ figma-tokens.json ──import.ts──▶ colors.ts + layout.mjs
                                                                     │
                                                            bun run setup:styles
                                                                     ▼
                                                          root.css + tailwind.css
```

The importer only writes the two **source** files; nothing downstream of
`setup:styles` changes. Every sync is validated by the existing contrast gate
(`bun run check`), so a design change that breaks WCAG AA fails CI.

## Figma file structure

The scaffolded file (`DqTvmFVFWGEqpuaxrcnWvZ`) has four variable collections plus
text styles. Figma **modes** map directly onto the repo's responsive breakpoints
and themes:

| Collection | Modes | Variables | Maps to |
|---|---|---|---|
| **Primitives** | `Value` | `black white red blue green` (color) | `colors` raw palette in `colors.ts` → `@theme --color-*` |
| **Color** | `Light Dark Red Evil` | `primary secondary contrast` (aliased to Primitives) | `themes` in `colors.ts` → `[data-theme=*]` overrides |
| **Layout** | `Mobile Desktop` | `columns gap safe device-width device-height header-height` (number) | `layout` / `screens` / `customSizes` in `layout.mjs` |
| **Typography** | `Mobile Desktop` | `{style}/font-size` + `{style}/line-height` (number) | `typography.figma.ts` → `typography.ts` → `@utility` classes |
| **Motion** | `Value` | `duration-fast duration duration-slow` (number, ms) | `motion.ts` → `--duration-*` in `root.css` |
| **Text styles** | — | `h1 h2 p-big p caption cta link` | per-style family / weight / letter-spacing / trim / OpenType features |

Conventions the pipeline relies on:

- Every variable carries **WEB code syntax** = its CSS var (`var(--color-primary)`,
  `var(--columns)`), so Figma Dev Mode shows the exact token the code uses.
- Semantic colors are **aliases** to primitives, never raw values — that's what
  lets `import.ts` emit `primary: colors.white` instead of a duplicated literal.
- Variable **descriptions** round-trip into code as comments (e.g. the red
  WCAG-tuning note lives on the `red` primitive in Figma).
- `Layout` numbers are **design px** at the reference device width; the repo
  emits them as fluid `vw`. `columns`/`gap`/`safe` → `layout`; `device-*` →
  `screens`; anything else → `customSizes`.

### Typography specifics

- **font-size** is bound to a variable on each text style, so it's responsive
  across Mobile/Desktop modes.
- **line-height** is NOT bound to the text style: Figma reinterprets a bound
  line-height variable as **pixels**, breaking the percent model. So line-height
  lives as its own percent variables (`{style}/line-height`, Mobile/Desktop),
  read by name on export. The text style carries a static percent for preview.
- **letter-spacing** must be **PERCENT** on text styles (`-5%` ↔ `-0.05em`); the
  export rejects `PIXELS`/`AUTO` with a clear error.
- **Vertical trim** ("Cap height to baseline", `leadingTrim: CAP_HEIGHT`) →
  `text-box-trim: both; text-box-edge: cap alphabetic`. `NONE` omits it.
  Caveat: `text-box-trim` is newly baseline-available (Chrome 133+, Safari 18.2+);
  older browsers show untrimmed leading — graceful degradation.
- **OpenType features** set on a text style export to `font-feature-settings`
  (e.g. `"tnum" 1`). The Plugin API can *read* them but not *write* them, so the
  scaffold seeds none — designers toggle them in Figma and they flow into code.
- **Font families** map via a code-owned table (`Oswald → display`,
  `Spline Sans Mono → mono`). An unknown family fails the export loudly — wiring a
  new font is a code change in `fonts.ts`, not something the sync can infer.

### Overriding in code

`typography.ts` is a hand-authored **merge shell**: it layers a code `overrides`
object over the generated `typography.figma.ts`. Overrides win. Use them where
the browser and Figma legitimately disagree (CSS half-leading, `text-box-trim`
support, next/font fallback metrics) or for deliberate divergence. Each
`figma:import` **warns** (never fails) when an override masks a value that
changed in Figma, so silent drift is visible.

## Syncing

### 1. Export from Figma → `figma-tokens.json`

`export.figma.js` is Figma **Plugin API** code (not a repo module — that's why
it's excluded from Biome). Run it one of two ways:

- **Agent / MCP** — paste its body into a `use_figma` call against the file; it
  returns the interchange object. Save that as `figma-tokens.json`.
- **Enterprise CI** — port it to the REST Variables API
  (`GET /v1/files/:key/variables/local`). Same collection/mode names, so the
  output shape is identical. (REST Variables API requires an Enterprise plan.)

The interchange shape is defined and validated by `schema.ts` (Zod).

### 2. Import into the repo

```bash
bun run figma:import   # figma-tokens.json → colors.ts + layout.mjs → setup:styles
bun run check          # validates contrast (WCAG AA), types, tests
```

`figma:import` converts colors to `oklch`, regenerates the source files
(formatted to house style), and runs `setup:styles`. It writes `colors.ts`,
`layout.mjs`, `typography.figma.ts`, and `motion.ts` — but **not** `typography.ts`
(the hand-authored override shell). `breakpoints` in `layout.mjs` is **code-owned**
(a media-query value, not a Figma variable) and preserved across syncs.

## Precision / the razor-thin red

sRGB ↔ oklch round-trips losslessly at this repo's precision (4/4/2 decimals):
the scaffolded palette re-imports byte-for-byte identical to the committed
values, red's `oklch(0.592 …)` included. Because the `red` primitive sits in a
narrow band that clears WCAG AA on both black and white (peak 4.583:1), any
future nudge in Figma is caught by `contrast.test.ts` on the next
`bun run check` — fix it in Figma, or re-record the baseline with
`bun run contrast:accept`.

## Scope

Synced today: **colors, layout, typography, motion**. Not synced (deliberately
code-owned):

- **Surfaces & lines** (`--surface`, `--line`, …) — `color-mix` derivations of
  `secondary`/`primary` in `global.css`. They auto-adapt across every theme from
  two inputs; flattening them into Figma would duplicate and drift. The contrast
  gate already measures them.
- **Easings** (`--ease-*`) — a curated, near-static set in `easings.css`; low
  churn, little sync value. Could become STRING variables later if desired.
- **Breakpoints** (`dt: 800`) — a media-query value, not a design token.

## Files

| File | Role |
|---|---|
| `export.figma.js` | Figma Plugin API snippet: Variables + text styles → interchange object |
| `figma-tokens.json` | The interchange artifact (committed snapshot) |
| `schema.ts` | Zod schema + `FigmaTokens` type — the export/import contract |
| `import.ts` | `figma-tokens.json` → source config → `setup:styles` (+ drift report) |

Generated by `import.ts` (do not edit): `colors.ts`, `layout.mjs`,
`typography.figma.ts`, `motion.ts`. Hand-authored: `typography.ts` (override shell).
