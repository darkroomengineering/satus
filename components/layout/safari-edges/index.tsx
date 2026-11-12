import s from './safari-edges.module.css'

/**
 * Two fixed strips at the top and bottom edges. Mobile Safari samples a fixed
 * element's background near each edge and paints it behind its status bar and
 * bottom toolbar, so the page color runs under both.
 * https://joshpuckett.me/seamless-mobile-safari
 *
 * Colors come from `--edge-top` / `--edge-bottom`, defaulting to the theme's
 * `--color-primary`. Each edge takes one solid color; gradients and images
 * can't extend behind the toolbars. Render outside any transformed ancestor:
 * a transform turns `position: fixed` into positioning against that ancestor.
 * `data-bar-tint` moves the `SafariBarDecoys` aside so the strips win.
 */
export function SafariEdges() {
  return (
    <>
      <div
        aria-hidden="true"
        className={s.edge}
        data-edge="top"
        data-bar-tint=""
      />
      <div
        aria-hidden="true"
        className={s.edge}
        data-edge="bottom"
        data-bar-tint=""
      />
    </>
  )
}

/**
 * Keeps iOS 26+ Safari's clear status bar and toolbar clear. Safari paints a
 * bar solid with the color of a full-width fixed (or stuck sticky) box found
 * mid-screen just inside that edge, such as a fixed header or a pinned section.
 * These two boxes sit on those points and are too small to count, so the page
 * shows through both bars instead.
 *
 * Any element carrying `data-bar-tint` hides them, which hands the bars back
 * to Safari's sampling: full-screen overlays (dialog backdrops, drawers) set
 * it while open, so both bars take the overlay's color instead of showing the
 * page sharp beside it. Safari draws a fixed box only between the bars, so an
 * overlay can't reach under them with negative insets.
 *
 * Rendered once, in app/(site)/layout.tsx, outside any transformed ancestor.
 */
export function SafariBarDecoys() {
  return (
    <>
      <div aria-hidden="true" className={s.decoy} data-edge="top" />
      <div aria-hidden="true" className={s.decoy} data-edge="bottom" />
    </>
  )
}
