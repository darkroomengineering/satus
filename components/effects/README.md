# Effect Components

Reveal-on-scroll and entrance animations use `useReveal`, not this directory (AGENTS.md § Animation). This directory holds anime.js effects: scrubbed scroll effects and timeline reveals. anime.js (`animejs`) runs on the Tempus loop, fed by Lenis's scroll, through the bridge in `components/layout/lenis/anime.tsx`. Effects load anime.js with `import('animejs')` inside their mount effect, as `progress-text` does: a top-level import puts the whole library (about 47 KB gzipped) in the first-load JavaScript of every route that renders the effect.

## Components

| Component        | Purpose                                                      |
| ---------------- | ------------------------------------------------------------ |
| `progress-text/` | Scroll-driven text reveal (`splitText` + `onScroll`, synced) |

## Progress Text

Words fade in as scroll progress advances, split by anime.js's `splitText` and
synced 1:1 to an `onScroll` observer. Content is static after mount: remount
with a `key` to change it. `prefers-reduced-motion` gets a single gentle fade
when the text enters instead of scroll linkage.

`enter` and `leave` take anime.js thresholds, viewport edge first, then the
element's: `enter="bottom top"` starts when the viewport's bottom meets the
element's top. The defaults run from there to `leave="center bottom"`, where
the element's bottom crosses the viewport's middle. The scroll distance between
`enter` and `leave` is how long the reveal lasts, so keep it well above one
line height. Near the page bottom, where the element can't reach the viewport
top, `leave="min top"` clamps the end to max scroll.
