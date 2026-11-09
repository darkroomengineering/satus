# RealViewport

Sets the `--scrollbar-width` CSS custom property from a measured scrollbar. `app/(site)/layout.tsx` wraps the app's children in `<RealViewport>`.

| Variable            | Description                       | Example                                       |
| ------------------- | --------------------------------- | --------------------------------------------- |
| `--scrollbar-width` | Browser scrollbar width in pixels | `width: calc(100vw - var(--scrollbar-width))` |

- Re-measured whenever the window width changes, through hamo `useWindowSize`. The value comes from a hidden scrolling probe element, so it reflects the browser's scrollbar width, not whether the page currently scrolls.
- Exposes no JavaScript store or subscription to consumers: read the CSS custom property.
