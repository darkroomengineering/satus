/**
 * @module store
 *
 * Central WebGL lifecycle store built on Zustand.
 *
 * Manages the activation state and tunnel instances for the global
 * `<Canvas>` / `<GlobalCanvas>` system. Components throughout the app
 * read from this store to decide whether to mount the canvas, whether
 * to enable the RAF loop, and where to portal WebGL or DOM children.
 *
 * Key consumers:
 * - **`GlobalCanvas`** -- reads `isActivated` to decide whether to
 *   mount the R3F canvas for the first time.
 * - **`Canvas`** / **`Wrapper`** -- read `isActive` to toggle CSS
 *   visibility and pause the render loop when no page needs WebGL.
 * - **`WebGLTunnel` / `DOMTunnel`** -- use the tunnel getters to
 *   obtain the shared `tunnel-rat` instances for portaling children.
 */
import tunnel from 'tunnel-rat'
import { create } from 'zustand'

type WebGLTunnelInstance = ReturnType<typeof tunnel>

/**
 * Module-level singleton tunnels.
 * Created lazily on first access, persist for app lifetime.
 * This avoids React state timing issues during render.
 */
let webGLTunnelSingleton: WebGLTunnelInstance | null = null
let domTunnelSingleton: WebGLTunnelInstance | null = null

function getWebGLTunnel(): WebGLTunnelInstance {
  if (!webGLTunnelSingleton) {
    webGLTunnelSingleton = tunnel()
  }
  return webGLTunnelSingleton
}

function getDOMTunnel(): WebGLTunnelInstance {
  if (!domTunnelSingleton) {
    domTunnelSingleton = tunnel()
  }
  return domTunnelSingleton
}

type WebGLStore = {
  /**
   * Whether the GlobalCanvas has been activated (mounted).
   * Once true, the canvas stays mounted forever.
   */
  isActivated: boolean

  /**
   * Whether the current page needs WebGL rendering.
   * Controls CSS visibility and RAF for performance.
   */
  isActive: boolean

  /**
   * Get the shared WebGL tunnel instance (lazy singleton).
   */
  getWebGLTunnel: () => WebGLTunnelInstance

  /**
   * Get the shared DOM tunnel instance (lazy singleton).
   */
  getDOMTunnel: () => WebGLTunnelInstance

  /**
   * Activate the global canvas (lazy initialization).
   * Called when first WebGL page is visited.
   */
  activate: () => void

  /**
   * Set whether current page needs WebGL.
   * Used to control CSS visibility and RAF.
   */
  setActive: (active: boolean) => void
}

/**
 * Zustand hook for the global WebGL lifecycle state.
 *
 * Consumed by `Canvas`, `GlobalCanvas`, `Wrapper`, and tunnel components
 * to coordinate lazy canvas activation, visibility toggling, and
 * child portaling.
 *
 * @example
 * ```tsx
 * // Read activation state
 * const isActivated = useWebGLStore((s) => s.isActivated)
 *
 * // Activate the canvas on first WebGL page visit
 * const activate = useWebGLStore((s) => s.activate)
 * useEffect(() => { activate() }, [activate])
 * ```
 */
export const useWebGLStore = create<WebGLStore>((set, get) => ({
  isActivated: false,
  isActive: false,

  getWebGLTunnel,
  getDOMTunnel,

  activate: () => {
    const state = get()
    // Only activate once
    if (state.isActivated) return

    set({
      isActivated: true,
      isActive: true,
    })
  },

  setActive: (active: boolean) => {
    set({ isActive: active })
  },
}))
