import { tunnel } from '@/webgl/utils/tunnel'

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

// Registry of `<Canvas root>` instances currently mounted (layout canvas +
// a per-page `<Wrapper webgl>` both grab the same singleton tunnels above,
// silently doubling GPU cost if both were allowed to render). Used for the
// dev-only multiple-mount warning below and to pick a fallback candidate
// when the primary (see claimPrimary/releasePrimary) unmounts. Registration
// happens in an effect with a symmetric unregister cleanup, so React Strict
// Mode's mount→cleanup→mount on a single instance never leaves a stale entry
// behind — only two instances mounted at once ever coexist here.
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
 * In development, warns if more than one root canvas is mounted at the same
 * time — once per occurrence, not just once per page load: the warning flag
 * resets whenever the overlap clears, so a second unrelated overlap later in
 * the same session (e.g. navigating between two pages that both mount
 * `<Wrapper webgl>`) warns again instead of going silent.
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
    if (rootCanvasIds.length <= 1) {
      hasWarnedMultipleRootMounts = false
    }
    emitRootCanvasChange()
  }
}

export function subscribeRootCanvas(listener: () => void): () => void {
  rootCanvasListeners.add(listener)
  return () => {
    rootCanvasListeners.delete(listener)
  }
}

// Primacy claim — a token, not a resource. Distinct from `rootCanvasIds`
// above: that registry is populated post-commit (from an effect) and is only
// used for the dev warning + fallback promotion. The claim below is set
// synchronously from the render body, so the very first commit already knows
// which `<Canvas root>` instance is primary — no window where two instances
// both see "unclaimed" and both mount a full r3f Canvas + WebGLRenderer
// wired to the same singleton tunnels.
let primaryClaimId: string | undefined
const primaryClaimListeners = new Set<() => void>()

function emitPrimaryClaimChange() {
  for (const listener of primaryClaimListeners) {
    listener()
  }
}

/**
 * Synchronously claim (or confirm) primacy for `id`. Call directly from the
 * render body — not an effect — so mounting the GL canvas can be decided in
 * the same render that renders it.
 *
 * Idempotent per id: re-claiming with the id that already holds the slot
 * returns `true` again without side effects, so React Strict Mode's double
 * render (and a render that never commits) are safe. Claiming while a
 * *different* id holds the slot always returns `false` — only that id's
 * `releasePrimary` call can free the slot.
 *
 * @returns Whether `id` is (now, or already) the primary.
 */
export function claimPrimary(id: string): boolean {
  if (primaryClaimId === undefined) {
    primaryClaimId = id
    emitPrimaryClaimChange()
  }
  return primaryClaimId === id
}

/**
 * Release a primacy claim. Call from the mounting effect's cleanup (never
 * from render) — pairing the synchronous claim with an effect-owned release
 * keeps resource teardown on the effect lifecycle the rest of the codebase
 * relies on. If `id` held the slot, promotes the next currently-registered
 * root canvas (see `registerRootCanvasMount`) so a survivor takes over
 * without waiting for its own next render.
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

/** The id of the current primary claim holder, if any. */
export function getPrimaryClaimId(): string | undefined {
  return primaryClaimId
}

/** Server snapshot — no canvas ever claims primacy during SSR. */
export function getServerPrimaryClaimId(): undefined {
  return undefined
}

// Bumped whenever the root canvas's WebGL context is restored after a loss
// (mobile GPU reset, long-backgrounded tab — see webgl.tsx's
// `webglcontextlost`/`webglcontextrestored` listeners). Hand-built
// double-buffered render targets (the fluid/flowmap sims) sit outside
// three.js's own tracked-restore path, so nothing rebuilds them on restore
// unless something forces it: `useFluidSim`/`useFlowmapSim` include this
// value in their create/destroy effect's deps, so a bump replays their
// existing cleanup→recreate cycle.
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
