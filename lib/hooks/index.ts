/**
 * Custom React Hooks
 *
 * Import individual hooks:
 *   import { useScrollTrigger } from '@/hooks/use-scroll-trigger'
 *
 * Or import from barrel:
 *   import { useScrollTrigger, useTransform } from '@/hooks/use-scroll-trigger'
 */

export { useStore } from './store'
export { useDeviceDetection } from './use-device-detection'
export { usePrefetch } from './use-prefetch'
export {
  type UseScrollTriggerOptions,
  useScrollTrigger,
} from './use-scroll-trigger'
export {
  TransformContext,
  TransformProvider,
  useTransform,
} from './use-transform'
