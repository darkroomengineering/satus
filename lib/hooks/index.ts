/**
 * Custom React Hooks
 *
 */

// Standard context type
export type { StandardContext } from '@/utils/context'
export { useStore } from './store'
export { useDeviceDetection } from './use-device-detection'
export { usePrefetch } from './use-prefetch'
export {
  useDocumentVisibility,
  useMediaQuery,
  useOnlineStatus,
  usePreferredColorScheme,
  usePreferredReducedMotion,
} from './use-sync-external'
