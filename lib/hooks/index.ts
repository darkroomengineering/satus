/**
 * Custom React Hooks
 *
 */

export { useMediaQuery } from 'hamo'
// Standard context type
export type { StandardContext } from '@/utils/context'
export { useStore } from './store'
export { useDeviceDetection } from './use-device-detection'
export { usePrefetch } from './use-prefetch'
export { useReveal } from './use-reveal'
export {
  useDocumentVisibility,
  useOnlineStatus,
  usePreferredColorScheme,
  usePreferredReducedMotion,
} from './use-sync-external'
