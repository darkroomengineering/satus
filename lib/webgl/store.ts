import { type Tunnel, tunnel } from '@/webgl/utils/tunnel'

let webGLTunnelSingleton: Tunnel | null = null
let domTunnelSingleton: Tunnel | null = null

export function getWebGLTunnel(): Tunnel {
  if (!webGLTunnelSingleton) {
    webGLTunnelSingleton = tunnel()
  }
  return webGLTunnelSingleton
}

export function getDOMTunnel(): Tunnel {
  if (!domTunnelSingleton) {
    domTunnelSingleton = tunnel()
  }
  return domTunnelSingleton
}

// `<Canvas root>` instances currently mounted. A layout canvas plus a per-page
// `<Wrapper webgl>` would share the singleton tunnels above and silently double
// GPU cost. Feeds the dev multiple-mount warning and picks the successor when
// the primary unmounts (see claimPrimary/releasePrimary). Registration is an
// effect with a symmetric cleanup, so Strict Mode's mount→cleanup→mount never
// leaves a stale entry.
let rootCanvasIds: readonly string[] = []
let hasWarnedMultipleRootMounts = false

/**
 * Register a `<Canvas root>` mount under a stable id (e.g. from `useId`) from
 * the mounting effect; call the returned cleanup on unmount. In development,
 * warns when more than one root canvas is mounted. The warning flag resets
 * when the overlap clears, so a later unrelated overlap (navigating between
 * two pages that both mount `<Wrapper webgl>`) warns again.
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

  return () => {
    rootCanvasIds = rootCanvasIds.filter((rootId) => rootId !== id)
    if (rootCanvasIds.length <= 1) {
      hasWarnedMultipleRootMounts = false
    }
  }
}

// Primacy claim: a token, not a resource. `rootCanvasIds` is populated
// post-commit (from an effect); the claim is set synchronously in the render
// body, so the first commit already knows which instance is primary and two
// instances never both mount a WebGLRenderer on the same tunnels.
let primaryClaimId: string | undefined
const primaryClaimListeners = new Set<() => void>()

function emitPrimaryClaimChange() {
  for (const listener of primaryClaimListeners) {
    listener()
  }
}

/**
 * Claim (or confirm) primacy for `id`; call it from the render body, not an
 * effect, so mounting the GL canvas is decided in the render that renders it.
 *
 * Never notifies subscribers: doing that during render re-renders subscribed
 * components mid-render ("Cannot update a component while rendering a
 * different component"). The claimer calls `announcePrimaryClaim` from a
 * layout effect instead.
 *
 * Idempotent per id, so Strict Mode's double render (and a render that never
 * commits) is safe. Claiming while a different id holds the slot returns
 * `false`; only that id's `releasePrimary` frees it.
 */
export function claimPrimary(id: string): boolean {
  if (primaryClaimId === undefined) {
    primaryClaimId = id
  }
  return primaryClaimId === id
}

/**
 * Tell subscribers the claim changed. Call from the primary's layout effect,
 * after the claiming commit and before paint, so `useRootCanvasMounted`
 * consumers update in the same frame. Cost: a consumer that already rendered in
 * the claiming commit renders once more.
 */
export function announcePrimaryClaim(): void {
  emitPrimaryClaimChange()
}

/**
 * Call from the mounting effect's cleanup, never from render, so teardown
 * stays on the effect lifecycle. If `id` held the slot, promotes the next
 * registered root canvas so a survivor takes over without waiting for its own
 * next render.
 */
export function releasePrimary(id: string): void {
  if (primaryClaimId !== id) return
  primaryClaimId = rootCanvasIds.find((rootId) => rootId !== id)
  emitPrimaryClaimChange()
}

export function subscribePrimaryClaim(listener: () => void): () => void {
  primaryClaimListeners.add(listener)
  return () => {
    primaryClaimListeners.delete(listener)
  }
}

export function getPrimaryClaimId(): string | undefined {
  return primaryClaimId
}

/** Server snapshot — no canvas ever claims primacy during SSR. */
export function getServerPrimaryClaimId(): undefined {
  return undefined
}

/**
 * Whether a mounted root canvas exists for tunnel content to portal into.
 * Reuses the primacy claim (it only exists while its canvas is mounted) so it
 * can subscribe via `subscribePrimaryClaim` instead of a second listener set
 * that could drift out of sync.
 */
export function isRootCanvasRegistered(): boolean {
  return primaryClaimId !== undefined
}

/** Server snapshot — no root canvas is ever mounted during SSR. */
export function getServerRootCanvasRegistered(): boolean {
  return false
}

// Bumped when the root canvas's WebGL context is restored after a loss (mobile
// GPU reset, long-backgrounded tab; see webgl.tsx's `webglcontextlost` /
// `webglcontextrestored` listeners). Hand-built double-buffered render targets
// (the fluid/flowmap sims) sit outside three.js's tracked-restore path, so
// `useFluidSim`/`useFlowmapSim` include this value in their create/destroy
// effect deps, and a bump replays their cleanup→recreate cycle.
let contextGeneration = 0
const contextGenerationListeners = new Set<() => void>()

export function bumpContextGeneration(): void {
  contextGeneration += 1
  for (const listener of contextGenerationListeners) {
    listener()
  }
}

export function subscribeContextGeneration(listener: () => void): () => void {
  contextGenerationListeners.add(listener)
  return () => {
    contextGenerationListeners.delete(listener)
  }
}

export function getContextGeneration(): number {
  return contextGeneration
}

/** Server snapshot — context loss/restore only happens in the browser. */
export function getServerContextGeneration(): number {
  return 0
}
