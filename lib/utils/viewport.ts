/**
 * Viewport Utilities
 *
 * Convert pixel values to viewport-relative sizes.
 * Useful for responsive scaling that maintains design proportions.
 *
 * @example
 * ```ts
 * import { desktopVW, mobileVW } from '@/utils/viewport'
 *
 * // In a resize handler
 * const width = window.innerWidth
 * const scaledSize = width >= 800 ? desktopVW(100, width) : mobileVW(100, width)
 * ```
 *
 * ## When to Use
 *
 * - **CSS**: Prefer the PostCSS functions `desktop-vw()` and `mobile-vw()`
 * - **JavaScript**: Use these for dynamic calculations (canvas, WebGL, etc.)
 *
 * ## Design Widths
 *
 * These functions scale values relative to the design viewport:
 * - Desktop: 1728px
 * - Mobile: 375px
 *
 * A 100px element designed at 1728px will be ~58px at 1000px viewport.
 */

import { screens } from '@/lib/styles/config'

/**
 * Scales a pixel value relative to the desktop design width.
 *
 * @param value - Size in pixels at desktop design width (1728px)
 * @param width - Current viewport width
 * @returns Scaled pixel value
 *
 * @example
 * ```ts
 * // Design has a 200px element at 1728px width
 * // At 864px viewport, it becomes 100px
 * desktopVW(200, 864) // 100
 *
 * // Common usage in resize handler
 * window.addEventListener('resize', () => {
 *   const fontSize = desktopVW(48, window.innerWidth)
 *   element.style.fontSize = `${fontSize}px`
 * })
 * ```
 */
export function desktopVW(value: number, width: number): number {
  return (value * width) / screens.desktop.width
}

/**
 * Scales a pixel value relative to the mobile design width.
 *
 * @param value - Size in pixels at mobile design width (375px)
 * @param width - Current viewport width
 * @returns Scaled pixel value
 *
 * @example
 * ```ts
 * // Design has a 16px font at 375px width
 * // At 320px viewport, it becomes ~13.6px
 * mobileVW(16, 320) // 13.65...
 * ```
 */
export function mobileVW(value: number, width: number): number {
  return (value * width) / screens.mobile.width
}

/**
 * Scales a pixel value relative to the desktop design height.
 *
 * @param value - Size in pixels at desktop design height
 * @param height - Current viewport height
 * @returns Scaled pixel value
 */
export function desktopVH(value: number, height: number): number {
  return (value * height) / screens.desktop.height
}

/**
 * Scales a pixel value relative to the mobile design height.
 *
 * @param value - Size in pixels at mobile design height
 * @param height - Current viewport height
 * @returns Scaled pixel value
 */
export function mobileVH(value: number, height: number): number {
  return (value * height) / screens.mobile.height
}
