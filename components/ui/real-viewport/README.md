# RealViewport

Sets CSS custom properties for accurate viewport measurements. `app/(site)/layout.tsx` wraps the app's children in `<RealViewport>`.

| Variable            | Description                       | Example                                       |
| ------------------- | --------------------------------- | --------------------------------------------- |
| `--scrollbar-width` | Browser scrollbar width in pixels | `width: calc(100vw - var(--scrollbar-width))` |

- Recalculated on every `resize` (passive listener), in case the page switches overflow modes (e.g. a modal opens or closes).
- No JavaScript store or subscription: only CSS custom properties are set.
