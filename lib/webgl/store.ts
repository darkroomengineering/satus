import tunnel from 'tunnel-rat'

type WebGLTunnelInstance = ReturnType<typeof tunnel>

let webGLTunnelSingleton: WebGLTunnelInstance | null = null
let domTunnelSingleton: WebGLTunnelInstance | null = null

export function getWebGLTunnel(): WebGLTunnelInstance {
  if (!webGLTunnelSingleton) {
    webGLTunnelSingleton = tunnel()
  }
  return webGLTunnelSingleton
}

export function getDOMTunnel(): WebGLTunnelInstance {
  if (!domTunnelSingleton) {
    domTunnelSingleton = tunnel()
  }
  return domTunnelSingleton
}

// Registry of `<Canvas root>` instances currently mounting the WebGL surface
// (layout canvas + a per-page `<Wrapper webgl>` both grab the same singleton
// tunnels above, silently doubling GPU cost). Exposed as an external store so
// components read it via `useSyncExternalStore`: the first registered id is
// the primary — every other root canvas must render nothing, making a second
// root mount a real no-op (not just a dev warning) in every environment.
// Registration happens in an effect with a symmetric unregister cleanup, so
// React Strict Mode's mount→cleanup→mount on a single instance never leaves a
// stale entry behind — only two instances mounted at once ever coexist here.
let rootCanvasIds: readonly string[] = []
const rootCanvasListeners = new Set<() => void>()
let hasWarnedMultipleRootMounts = false

function emitRootCanvasChange() {
  for (const listener of rootCanvasListeners) {
    listener()
  }
}

/**
 * Register a `<Canvas root>` mount under a stable id (e.g. from `useId`).
 * Call from the mounting effect; call the returned cleanup on unmount.
 * In development, warns once if more than one root canvas is mounted at the
 * same time.
 */
export function registerRootCanvasMount(id: string): () => void {
  rootCanvasIds = [...rootCanvasIds, id]

  if (
    process.env.NODE_ENV === 'development' &&
    rootCanvasIds.length > 1 &&
    !hasWarnedMultipleRootMounts
  ) {
    hasWarnedMultipleRootMounts = true
    console.warn(
      'Two <Canvas root> mounted — use either the shared layout canvas OR <Wrapper webgl>, not both.'
    )
  }

  emitRootCanvasChange()

  return () => {
    rootCanvasIds = rootCanvasIds.filter((rootId) => rootId !== id)
    emitRootCanvasChange()
  }
}

export function subscribeRootCanvas(listener: () => void): () => void {
  rootCanvasListeners.add(listener)
  return () => {
    rootCanvasListeners.delete(listener)
  }
}

/** The id of the primary (first-registered) root canvas, if any. */
export function getPrimaryRootCanvasId(): string | undefined {
  return rootCanvasIds[0]
}

/** Server snapshot — no canvas ever registers during SSR. */
export function getServerPrimaryRootCanvasId(): undefined {
  return undefined
}
