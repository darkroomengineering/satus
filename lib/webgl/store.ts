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

// Tracks how many `<Canvas root>` instances are actually mounting the WebGL
// surface (layout canvas + a per-page `<Wrapper webgl>` both grab the same
// singleton tunnels above, silently doubling GPU cost). Sequential
// mount→cleanup→mount from React Strict Mode double-invoking a single
// instance's effect never pushes the count past 1, so it can't cause a
// false-positive warning — only two instances mounted at once do.
let rootMountCount = 0
let hasWarnedMultipleRootMounts = false

/**
 * Register a `<Canvas root>` mount. Call from the mounting effect; call the
 * returned `unregister` from its cleanup. `isPrimary` is `true` only for the
 * first root canvas registered at a time — callers must skip rendering the
 * WebGL surface when it's `false`, so a second root mount is a no-op (not
 * just a dev warning) in every environment. In development, also warns once
 * if more than one root canvas is mounted at the same time.
 */
export function registerRootCanvasMount(): {
  isPrimary: boolean
  unregister: () => void
} {
  rootMountCount++
  const isPrimary = rootMountCount === 1

  if (
    process.env.NODE_ENV === 'development' &&
    rootMountCount > 1 &&
    !hasWarnedMultipleRootMounts
  ) {
    hasWarnedMultipleRootMounts = true
    console.warn(
      'Two <Canvas root> mounted — use either the shared layout canvas OR <Wrapper webgl>, not both.'
    )
  }

  return {
    isPrimary,
    unregister: () => {
      rootMountCount--
    },
  }
}
