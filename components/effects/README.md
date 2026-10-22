# Effect Components

> **Reveal-on-scroll and entrance animations** use the `useReveal` hook + the `[data-reveal]` CSS contract — not this directory. See `lib/hooks` and AGENTS.md § Animation.

This directory is for anime.js effects: scrubbed scroll effects and timeline reveals. anime.js runs on the Tempus loop, fed by Lenis's scroll, through the bridge in `components/layout/lenis/anime.tsx`.

## Components

| Component        | Purpose                                                      |
| ---------------- | ------------------------------------------------------------ |
| `progress-text/` | Scroll-driven text reveal (`splitText` + `onScroll`, synced) |

## Progress Text

Words fade in as scroll progress advances, split by anime.js's `splitText` and
synced 1:1 to an `onScroll` observer (fed by Lenis through the bridge in
`components/layout/lenis`). Content is static after mount — remount with a
`key` to change it. `prefers-reduced-motion` gets a single gentle fade when
the text enters instead of scroll linkage.

`enter` and `leave` take anime.js thresholds, viewport edge first, then the
element's: `enter="bottom top"` starts when the viewport's bottom meets the
element's top. The defaults run from there to `leave="center bottom"`, where
the element's bottom crosses the viewport's middle. The scroll distance between `enter` and `leave` is how long the
reveal lasts, so keep it well above one line height. Near the page bottom,
where the element can't reach the viewport top, `leave="min top"` clamps the
end to max scroll.

```tsx
import { ProgressText } from '@/components/effects/progress-text'

;<ProgressText enter="bottom top" leave="min top">
  This text reveals as you scroll through the section
</ProgressText>
```

## Dependencies

- **anime.js** — animation library (`animejs`)
- **Tempus** — RAF management (`tempus`)
