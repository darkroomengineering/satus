'use client'

import { type Rect, useTransform, useWindowSize } from 'hamo'
import { useLenis } from 'lenis/react'
import { useEffect, useEffectEvent, useRef } from 'react'
import { Euler, Vector3 } from 'three'

/**
 * Where a DOM element sits in the root canvas, in the orthographic camera's
 * units: one unit per CSS pixel, origin mid-screen.
 */
export interface WebGLTransform {
  /** World-space centre of the element (z = 0). */
  position: Vector3
  /** Reserved; always identity. */
  rotation: Euler
  /** World-space size: x = width, y = height. */
  scale: Vector3
  /** Whether any of the element, as placed, is inside the viewport on both axes. */
  isVisible: boolean
}

/**
 * Place WebGL content on a DOM element's rect.
 *
 * Takes a rect from hamo's `useRect` (measure the element yourself, with
 * whatever options it needs, and pass the rect down) and turns it, the
 * scroll and any `TransformProvider` translate above the element into a
 * {@link WebGLTransform} handed to `onUpdate`. Event-driven, not per frame:
 * the callback runs on Lenis scroll events (emitted inside Lenis's raf,
 * before the canvas draws), on provider transform changes, and after any
 * render of the calling component, which covers the first measurement and
 * every re-measure. Without Lenis it listens to the window's scroll event
 * instead. Nothing runs while nothing moves.
 *
 * Works on either side of the tunnel. Called in the mesh component, inside
 * the canvas, the render effect runs after the mesh mounts, so the mesh is
 * placed at once and nothing else is needed. Called on the DOM side, the
 * mesh can mount later than the element (the root canvas waits for
 * `window.load`) with no event of its own; the returned `update` is for the
 * mesh's ref callback in that case.
 *
 * The size comes from hamo's `useWindowSize`, the layout viewport without the
 * scrollbar, which is the size the fixed root canvas has.
 *
 * @example
 * ```tsx
 * // DOM side: measure the element and pass the rect through the tunnel.
 * function Box({ className }: { className?: string }) {
 *   const [setRectRef, rect] = useRect({ ignoreTransform: true })
 *   return (
 *     <div ref={setRectRef} className={className}>
 *       <WebGLTunnel>
 *         <BoxMesh rect={rect} />
 *       </WebGLTunnel>
 *     </div>
 *   )
 * }
 *
 * // Canvas side: place the mesh on it.
 * function BoxMesh({ rect }: { rect: Rect }) {
 *   const meshRef = useRef<Mesh>(null)
 *   useWebGLRect(rect, ({ position, scale, isVisible }) => {
 *     const mesh = meshRef.current
 *     if (!mesh) return
 *     mesh.position.copy(position)
 *     mesh.scale.copy(scale)
 *     mesh.visible = isVisible
 *   })
 *   return <mesh ref={meshRef} visible={false}>…</mesh>
 * }
 * ```
 *
 * @param rect - The element's rect from hamo's `useRect`. Pass
 *   `ignoreTransform: true` to `useRect` for an element that moves under a
 *   `TransformProvider`, so its transform counts once, here, and never in
 *   the measurement.
 * @param onUpdate - Called with the latest transform on every update. The
 *   object is reused between calls: copy out of it, don't keep it.
 * @returns A function that re-runs `onUpdate` on demand.
 */
export function useWebGLRect(
  rect: Rect,
  onUpdate?: (transform: WebGLTransform) => void
): () => void {
  const { width, height } = useWindowSize()
  const lenis = useLenis()
  const getTransform = useTransform()

  const transformRef = useRef<WebGLTransform>({
    position: new Vector3(),
    rotation: new Euler(),
    scale: new Vector3(1, 1, 1),
    isVisible: false,
  })

  // React's `useEffectEvent` is called here from outside its documented
  // contract (only from Effects; never passed to hooks or returned): the
  // Lenis and provider subscriptions, the window listener and a consumer's
  // ref callback. At runtime it only refuses calls during render, and none
  // of these are, so it works; the rules-of-hooks lint enforces the contract
  // by name, hence the three disables. The cost: its identity changes every
  // render, so `useLenis` re-subscribes and calls it once per render of the
  // caller. Those renders are rare (a rect, a size, a src).
  const update = useEffectEvent(() => {
    if (width === undefined || height === undefined) return
    if (
      rect.top === undefined ||
      rect.height === undefined ||
      rect.left === undefined ||
      rect.width === undefined
    ) {
      // Not measured yet: nothing to place against.
      return
    }

    const { translate, scale } = getTransform()
    const scroll = lenis ? Math.round(lenis.scroll) : window.scrollY
    const transform = transformRef.current

    // The element as placed: its centre in document space with the provider's
    // translate, and its half-extents with the provider's scale, which applies
    // about the centre. x is viewport-relative on a vertically scrolling page.
    const centerX = rect.left + rect.width / 2 + translate.x
    const centerY = rect.top + rect.height / 2 + translate.y
    const halfWidth = (rect.width * scale.x) / 2
    const halfHeight = (rect.height * scale.y) / 2

    // Visible when that extent overlaps the viewport on both axes.
    transform.isVisible =
      centerX + halfWidth > 0 &&
      centerX - halfWidth < width &&
      centerY + halfHeight > scroll &&
      centerY - halfHeight < scroll + height
    transform.position.x = -width / 2 + centerX
    transform.position.y = height / 2 - centerY + scroll
    transform.scale.x = rect.width * scale.x
    transform.scale.y = rect.height * scale.y

    onUpdate?.(transform)
  })

  // Apply after every render as well: the rect, the size or the callback just
  // changed, and the next scroll event may be a long way off. A box
  // re-measured after a resize would otherwise sit wrong until the page
  // scrolls.
  useEffect(update)

  // oxlint-disable-next-line react-hooks/rules-of-hooks -- effect event outside an Effect, see above
  useTransform(update, [])
  // oxlint-disable-next-line react-hooks/rules-of-hooks -- effect event outside an Effect, see above
  useLenis(update, [])

  // Fallback for a page without Lenis. Every closure `update` returns reads
  // the same implementation slot, so the one captured here stays fresh and
  // is not a dependency.
  useEffect(() => {
    if (lenis) return

    window.addEventListener('scroll', update, false)

    return () => {
      window.removeEventListener('scroll', update, false)
    }
  }, [lenis])

  // oxlint-disable-next-line react-hooks/rules-of-hooks -- effect event outside an Effect, see above
  return update
}
