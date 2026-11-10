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

/**
 * Subscribe to content changes in both shared tunnels; pairs with
 * {@link hasTunnelConsumer} in `useSyncExternalStore`.
 */
export function subscribeTunnelContent(listener: () => void): () => void {
  const unsubscribeWebGL = getWebGLTunnel().subscribe(listener)
  const unsubscribeDOM = getDOMTunnel().subscribe(listener)
  return () => {
    unsubscribeWebGL()
    unsubscribeDOM()
  }
}

/**
 * Whether anything has portaled into either shared tunnel this session. The
 * root canvas waits for it, so routes with no WebGL content never download
 * three.js. `DOMTunnel` counts because its `Out` renders inside the canvas.
 * It never turns false, so a mounted canvas outlives navigation to a route
 * with no WebGL content.
 */
export function hasTunnelConsumer(): boolean {
  return getWebGLTunnel().hasHadContent() || getDOMTunnel().hasHadContent()
}

/** Server snapshot: tunnel content only registers in the browser. */
export function getServerHasTunnelConsumer(): boolean {
  return false
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
 *
 * Takes the primary claim from another id that has not confirmed it: that
 * render has not committed and may never, and this canvas has. Subscribers are
 * notified, so the mounting canvas re-renders as primary.
 */
export function registerRootCanvasMount(id: string): () => void {
  rootCanvasIds = [...rootCanvasIds, id]

  takeUnconfirmedPrimaryClaim(id)

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
//
// A claim made in render is a lease until its commit confirms it
// (`announcePrimaryClaim`). React can discard a render that never commits
// (suspense, an error boundary, an abandoned transition), and a discarded
// instance never runs the cleanup that releases its claim. A root canvas that
// mounts takes an unconfirmed claim at once (`registerRootCanvasMount`), so
// such a claim cannot block the real canvas; with no canvas mounting, the
// lease expires so the claim cannot report a canvas that never mounted. Cost:
// a render that is only slow to commit loses primacy to a canvas that mounts
// meanwhile.
let primaryClaimId: string | undefined
// Pending exactly while the claim is unconfirmed; every write to
// `primaryClaimId` clears or replaces it, so a stale timer never fires.
let primaryClaimLease: ReturnType<typeof setTimeout> | undefined
const primaryClaimListeners = new Set<() => void>()

const PRIMARY_CLAIM_LEASE_MS = 5000

function emitPrimaryClaimChange() {
  for (const listener of primaryClaimListeners) {
    listener()
  }
}

function clearPrimaryClaimLease() {
  clearTimeout(primaryClaimLease)
  primaryClaimLease = undefined
}

// Hands the slot to a committed root canvas, or empties it. Registered ids
// have committed, so a promoted survivor needs no lease.
function promotePrimaryClaim(exceptId: string) {
  clearPrimaryClaimLease()
  primaryClaimId = rootCanvasIds.find((rootId) => rootId !== exceptId)
  emitPrimaryClaimChange()
}

// Hands the slot to `id`, a root canvas that has committed, when another id
// holds it unconfirmed. A pending lease is what marks a claim unconfirmed, so
// a confirmed claim stays where it is.
function takeUnconfirmedPrimaryClaim(id: string) {
  if (primaryClaimLease === undefined || primaryClaimId === id) return
  clearPrimaryClaimLease()
  primaryClaimId = id
  emitPrimaryClaimChange()
}

/**
 * Claim (or confirm) primacy for `id`; call it from the render body, not an
 * effect, so mounting the GL canvas is decided in the render that renders it.
 *
 * Never notifies subscribers: doing that during render re-renders subscribed
 * components mid-render ("Cannot update a component while rendering a
 * different component"). The claimer calls `announcePrimaryClaim` from a
 * layout effect instead, which also confirms the lease. An unconfirmed claim
 * expires after `PRIMARY_CLAIM_LEASE_MS`, or passes to a root canvas that
 * mounts before then; subscribers re-render in both cases.
 *
 * Idempotent per id, so Strict Mode's double render is safe. Claiming while a
 * different id holds the slot returns `false`. A confirmed claim leaves that
 * id only through its `releasePrimary`; an unconfirmed one also through an
 * expired lease or another canvas's mount.
 */
export function claimPrimary(id: string): boolean {
  if (primaryClaimId === undefined) {
    primaryClaimId = id
    primaryClaimLease = setTimeout(
      () => promotePrimaryClaim(id),
      PRIMARY_CLAIM_LEASE_MS
    )
  }
  return primaryClaimId === id
}

/**
 * Confirm `id`'s claim after its commit and tell subscribers the claim
 * changed. Call from the primary's layout effect, before paint, so
 * `useRootCanvasMounted` consumers update in the same frame. Cost: a consumer
 * that already rendered in the claiming commit renders once more.
 *
 * Takes the slot when it is empty: the caller committed as primary, but its
 * claim can be gone by now. The lease expires under a commit slower than
 * `PRIMARY_CLAIM_LEASE_MS`, and Strict Mode's effect replay runs the cleanup
 * that releases the claim, then this, without rendering in between. A slot
 * another canvas holds stays with it, whether that canvas claimed the empty
 * slot or took the caller's unconfirmed claim by mounting first, and the
 * caller re-renders as non-primary once its subscription sees the change.
 */
export function announcePrimaryClaim(id: string): void {
  primaryClaimId ??= id
  if (primaryClaimId === id) clearPrimaryClaimLease()
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
  promotePrimaryClaim(id)
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
