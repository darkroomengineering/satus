/**
 * Utils - Consolidated utilities for the Satus starter
 *
 * Import from '~/utils' for most common utilities:
 * import { clamp, lerp, slugify, fetchWithTimeout } from '~/utils'
 *
 * Or import specific modules:
 * import { easings } from '~/utils/animation'
 * import { generateSanityMetadata } from '~/utils/metadata'
 */

// Animation & Math
export {
  // Math utilities
  clamp,
  // Viewport
  desktopVW,
  ease,
  // Easings
  easings,
  // Animation helpers
  fromTo,
  lerp,
  mapRange,
  // RAF queue
  measure,
  mobileVW,
  modulo,
  mutate,
  stagger,
  truncate,
} from './animation'
// Fetch utilities
export {
  type FetchWithTimeoutOptions,
  fetchJSON,
  fetchWithTimeout,
} from './fetch'

// Metadata/SEO
export { generatePageMetadata, generateSanityMetadata } from './metadata'

// Performance monitoring
export {
  getCLS,
  getFCP,
  getFID,
  getLCP,
  getTTFB,
  type PerformanceMetric,
  reportWebVitals,
} from './performance'
// String & Object utilities
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
