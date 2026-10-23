'use client'

import dynamic from 'next/dynamic'
import {
  createContext,
  type PropsWithChildren,
  use,
  useEffect,
  useId,
  useLayoutEffect,
  useSyncExternalStore,
} from 'react'

import Orchestra from '@/lib/dev/orchestra'
import { useAfterLoad } from '@/lib/hooks/use-after-load'
import { useDeviceDetection } from '@/lib/hooks/use-device-detection'
import {
  announcePrimaryClaim,
  claimPrimary,
  getDOMTunnel,
  getPrimaryClaimId,
  getServerPrimaryClaimId,
  getServerRootCanvasRegistered,
  getWebGLTunnel,
  isRootCanvasRegistered,
  registerRootCanvasMount,
  releasePrimary,
  subscribePrimaryClaim,
} from '@/lib/webgl/store'
import type { tunnel } from '@/webgl/utils/tunnel'

const WebGLCanvas = dynamic(
  () => import('./webgl').then(({ WebGLCanvas }) => WebGLCanvas),
  {
    ssr: false,
  }
)

// Orchestra dev panel's WebGL toggle; defaults to `true` like its
// `defaultValue` in `lib/dev/cmdo.tsx`. Collapses to a constant `true` in
// production (`NODE_ENV` is inlined), so persisted dev-panel state never
// reaches visitors.
const NOOP_UNSUBSCRIBE = () => {
  // Production: nothing subscribed.
}

const subscribeToWebGLToggle = (onChange: () => void) =>
  process.env.NODE_ENV === 'development'
    ? Orchestra.subscribe((state) => state.webgl, onChange)
    : NOOP_UNSUBSCRIBE

const getWebGLToggle = () =>
  process.env.NODE_ENV === 'development'
    ? (Orchestra.getState().webgl ?? true)
    : true

// SSR renders enabled so the server and the first client paint agree.
const getWebGLToggleServerSnapshot = () => true

function useWebGLDevKillSwitch(): boolean {
  return useSyncExternalStore(
    subscribeToWebGLToggle,
    getWebGLToggle,
    getWebGLToggleServerSnapshot
  )
}

type TunnelInstance = ReturnType<typeof tunnel>

type CanvasContextValue =
  | { active: false }
  | { active: true; WebGLTunnel: TunnelInstance; DOMTunnel: TunnelInstance }

type CanvasProps = PropsWithChildren<{
  /**
   * Mount the WebGL canvas. Mount it once: in the shared layout or per page
   * via `<Wrapper webgl>`, never both. Without it, children fall back to the
   * mounted root canvas via {@link useCanvas}.
   */
  root?: boolean
  /** Force WebGL even on mobile/non-WebGL devices */
  force?: boolean
  /**
   * GPU simulations `FlowmapProvider` mounts (root canvas only). Defaults to
   * none: each costs a GPU pass and window listeners.
   */
  simTypes?: ('fluid' | 'flowmap')[]
  /**
   * When the root canvas draws: `true` (default) only while something
   * changed, `'always'` every frame, `false` never. See `@/webgl/utils/awake`.
   */
  render?: boolean | 'always'
}>

export const CanvasContext = createContext<CanvasContextValue>({
  active: false,
})

/**
 * `root` mounts the actual canvas, exactly once across the app. A non-root
 * `<Canvas>` mounts nothing and only lets children reach the root canvas
 * through {@link useCanvas}.
 */
export function Canvas({
  children,
  root = false,
  force = false,
  simTypes,
  ...props
}: CanvasProps) {
  const { isWebGL, isReducedMotion } = useDeviceDetection()
  const webglDevToggleEnabled = useWebGLDevKillSwitch()
  const afterLoad = useAfterLoad()

  const WebGLTunnel = root ? getWebGLTunnel() : undefined
  const DOMTunnel = root ? getDOMTunnel() : undefined

  // `force` bypasses the WebGL capability check, reduced-motion, and the
  // after-load gate. That gate keeps renderer boot and shader compile out of
  // hydration, where they bill as blocking time; skipping it costs exactly
  // that, so `force` should come with a measurement.
  //
  // Reduced-motion and non-WebGL devices mean the canvas may never mount:
  // anything that puts CONTENT in WebGL needs a DOM fallback, or `force` plus
  // damped motion inside the scene.
  //
  // The Orchestra toggle is a dev-only kill switch above all of that,
  // including `force`.
  const shouldRender =
    webglDevToggleEnabled &&
    root &&
    ((isWebGL && !isReducedMotion && afterLoad) || force)
  const contextValue: CanvasContextValue =
    WebGLTunnel && DOMTunnel
      ? { active: true, WebGLTunnel, DOMTunnel }
      : { active: false }

  // Guards against two <Canvas root> instances mounting a WebGLRenderer at
  // once (layout canvas + <Wrapper webgl>). A post-commit-only source would
  // show both `undefined` in the same commit, so the claim is decided
  // synchronously in render: the second instance already sees the first's
  // claim. `claimPrimary` is idempotent per id, so Strict Mode's double render
  // is safe. The store subscription only re-renders this instance when the
  // claim changes elsewhere (primary unmounted, survivor promoted); its return
  // value is unused. Release happens in the effect cleanup, never in render.
  const id = useId()
  useSyncExternalStore(
    subscribePrimaryClaim,
    getPrimaryClaimId,
    getServerPrimaryClaimId
  )
  const canMount = contextValue.active && shouldRender
  const isPrimary = canMount && claimPrimary(id)
  const isMounting = isPrimary

  // The claim above is silent; announce it once committed, before paint.
  useLayoutEffect(() => {
    if (isPrimary) announcePrimaryClaim()
  }, [isPrimary])

  useEffect(() => {
    if (!canMount) return
    const unregister = registerRootCanvasMount(id)
    return () => {
      unregister()
      releasePrimary(id)
    }
  }, [canMount, id])

  return (
    <CanvasContext.Provider value={contextValue}>
      {isMounting && <WebGLCanvas {...props} {...(simTypes && { simTypes })} />}
      {children}
    </CanvasContext.Provider>
  )
}

/**
 * Reactive read of {@link isRootCanvasRegistered}. Mount order isn't
 * guaranteed (a tunnel consumer can render before or after the root canvas,
 * or across a route change), so a mount-time snapshot would go stale.
 */
export function useRootCanvasMounted(): boolean {
  return useSyncExternalStore(
    subscribePrimaryClaim,
    isRootCanvasRegistered,
    getServerRootCanvasRegistered
  )
}

// Warn-once flag, reset when a root canvas mounts so it fires again if the
// misconfiguration recurs (mirrors the multi-root warning in store.ts).
let hasWarnedFallbackWithNoRoot = false

export function useCanvas() {
  const localContext = use(CanvasContext)
  const rootCanvasMounted = useRootCanvasMounted()
  const usesFallback = !localContext.active

  // The fallback tunnels always exist, but nothing listens unless a
  // `<Canvas root>` is mounted; warn in dev instead of a silent blank. Runs in
  // an effect so the module flag is only mutated post-commit.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    if (usesFallback && !rootCanvasMounted && !hasWarnedFallbackWithNoRoot) {
      hasWarnedFallbackWithNoRoot = true
      console.warn(
        'useCanvas() fell back to the shared tunnels but no <Canvas root> is mounted — portaled content has nothing to render into. Mount <Canvas root> in the layout or via <Wrapper webgl>.'
      )
    } else if (rootCanvasMounted) {
      hasWarnedFallbackWithNoRoot = false
    }
  }, [usesFallback, rootCanvasMounted])

  if (localContext.active) return localContext

  return {
    active: true as const,
    WebGLTunnel: getWebGLTunnel(),
    DOMTunnel: getDOMTunnel(),
  }
}
