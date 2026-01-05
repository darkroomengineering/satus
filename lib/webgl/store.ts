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
