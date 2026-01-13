/**
 * Utils - Consolidated utilities for the Satus starter
 *
 * ## Quick Import
 *
 * ```ts
 * import { clamp, lerp, slugify, fetchWithTimeout } from '@/utils'
 * ```
 *
 * ## Module Imports (recommended for clarity)
 *
 * ```ts
 * import { clamp, lerp, mapRange } from '@/utils/math'
 * import { easings, type EasingName } from '@/utils/easings'
 * import { fromTo, stagger } from '@/utils/animation'
 * import { measure, mutate } from '@/utils/raf'
 * import { desktopVW, mobileVW } from '@/utils/viewport'
 * import { fetchWithTimeout } from '@/utils/fetch'
 * import { slugify } from '@/utils/strings'
 * ```
 *
 * ## Available Modules
 *
 * | Module | Purpose |
 * |--------|---------|
 * | `math` | Pure math: clamp, lerp, mapRange, modulo, etc. |
 * | `easings` | Easing curves: easeOutCubic, easeInOutQuart, etc. |
 * | `animation` | Animation helpers: fromTo, stagger, spring |
 * | `raf` | DOM batching: measure, mutate |
 * | `viewport` | Viewport scaling: desktopVW, mobileVW |
 * | `fetch` | HTTP utilities: fetchWithTimeout, fetchJSON |
 * | `strings` | String/object helpers: slugify, mergeRefs |
 * | `metadata` | SEO: generatePageMetadata, generateSanityMetadata |
 * | `performance` | Web Vitals: reportWebVitals, getLCP, etc. |
 */

// ─────────────────────────────────────────────────────────────────────────────
// Animation (high-level animation helpers)
// ─────────────────────────────────────────────────────────────────────────────
export {
  ease,
  type FromToOptions,
  type FromToValue,
  fromTo,
  spring,
  stagger,
} from './animation'

// ─────────────────────────────────────────────────────────────────────────────
// Easings (animation curves)
// ─────────────────────────────────────────────────────────────────────────────
export { type EasingFunction, type EasingName, easings } from './easings'
// ─────────────────────────────────────────────────────────────────────────────
// Fetch (HTTP utilities with timeout support)
// ─────────────────────────────────────────────────────────────────────────────
export {
  type FetchWithTimeoutOptions,
  fetchJSON,
  fetchWithTimeout,
} from './fetch'
// ─────────────────────────────────────────────────────────────────────────────
// Math (pure mathematical functions)
// ─────────────────────────────────────────────────────────────────────────────
export {
  clamp,
  degToRad,
  distance,
  lerp,
  mapRange,
  modulo,
  normalize,
  radToDeg,
  roundTo,
  truncate,
} from './math'
// ─────────────────────────────────────────────────────────────────────────────
// Metadata/SEO (page metadata generation)
// ─────────────────────────────────────────────────────────────────────────────
export { generatePageMetadata, generateSanityMetadata } from './metadata'
// ─────────────────────────────────────────────────────────────────────────────
// Performance (Web Vitals monitoring)
// ─────────────────────────────────────────────────────────────────────────────
export {
  getCLS,
  getFCP,
  getFID,
  getLCP,
  getTTFB,
  type PerformanceMetric,
  reportWebVitals,
} from './performance'
// ─────────────────────────────────────────────────────────────────────────────
// RAF Queue (DOM batching to prevent layout thrashing)
// ─────────────────────────────────────────────────────────────────────────────
export { batch, measure, mutate } from './raf'
// ─────────────────────────────────────────────────────────────────────────────
// Strings & Objects (utility functions)
// ─────────────────────────────────────────────────────────────────────────────
export {
  arraytoObject,
  capitalizeFirstLetter,
  checkIsArray,
  convertToCamelCase,
  filterObjectKeys,
  isEmptyArray,
  isEmptyObject,
  iterableObject,
  mergeRefs,
  numberWithCommas,
  shortenObjectKeys,
  slugify,
  twoDigits,
} from './strings'
// ─────────────────────────────────────────────────────────────────────────────
// Viewport (responsive scaling utilities)
// ─────────────────────────────────────────────────────────────────────────────
export { desktopVH, desktopVW, mobileVH, mobileVW } from './viewport'
