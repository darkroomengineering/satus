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
 */
export function SafariEdges() {
  return (
    <>
      <div aria-hidden="true" className={s.edge} data-edge="top" />
      <div aria-hidden="true" className={s.edge} data-edge="bottom" />
    </>
  )
}
