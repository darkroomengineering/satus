'use client'

import { type Rect, useRect, useTransform, useWindowSize } from 'hamo'
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
 * hamo's `useRect` options, minus `lazy`: the rect is returned eagerly so it
 * can be passed down as a prop.
 */
type UseWebGLRectOptions = Omit<
  NonNullable<Parameters<typeof useRect>[0]>,
  'lazy'
>

/**
 * Follow a DOM element with WebGL content.
 *
 * Measures the element with hamo's `useRect` (once per resize, never on
 * scroll) and turns that rect, the scroll and any `TransformProvider`
 * translate above the element into a {@link WebGLTransform} handed to
 * `onUpdate`. Event-driven, not per frame: the callback runs on Lenis scroll
 * events (emitted inside Lenis's raf, before the canvas draws), on provider
 * transform changes, and after any render of the calling component, which
 * covers the first measurement and every re-measure. Without Lenis it
 * listens to the window's scroll event instead. Nothing runs while nothing
 * moves.
 *
 * Runs on the DOM side, so the callback usually copies the transform onto a
 * mesh held in a ref that the tunnelled scene attaches. That mesh can mount
 * after the element — the root canvas waits for `window.load`, and tunnel
 * content mounts in the fiber's own commit — and no event fires for it. The
 * third return value, `update`, is for the mesh's ref callback: call it when
 * the mesh attaches and it is placed at once.
 *
 * The size comes from hamo's `useWindowSize`, the layout viewport without the
 * scrollbar, which is the size the fixed root canvas has.
 *
 * @example
 * ```tsx
 * function Box({ className }: { className?: string }) {
 *   const meshRef = useRef<Mesh>(null)
 *   const [setRectRef, , update] = useWebGLRect(
 *     ({ position, scale, isVisible }) => {
 *       const mesh = meshRef.current
 *       if (!mesh) return
 *       mesh.position.copy(position)
 *       mesh.scale.copy(scale)
 *       mesh.visible = isVisible
 *     }
 *   )
 *
 *   return (
 *     <div ref={setRectRef} className={className}>
 *       <WebGLTunnel>
 *         <mesh
 *           ref={(mesh) => {
 *             meshRef.current = mesh
 *             if (mesh) update()
 *           }}
 *           visible={false}
 *         >
 *           …
 *         </mesh>
 *       </WebGLTunnel>
 *     </div>
 *   )
 * }
 * ```
 *
 * @param onUpdate - Called with the latest transform on every update. The
 *   object is reused between calls: copy out of it, don't keep it.
 * @param options - hamo `useRect` options. Pass `ignoreTransform: true` for
 *   an element that moves under a `TransformProvider`, so its transform
 *   counts once, here, and never in the measurement.
 * @returns `[setRectRef, rect, update]`: the ref callback for the element,
 *   its document-space rect (fields undefined until measured), and a stable
 *   function that re-runs `onUpdate` on demand.
 */
export function useWebGLRect(
  onUpdate?: (transform: WebGLTransform) => void,
  options: UseWebGLRectOptions = {}
): [(element: HTMLElement | null) => void, Rect, () => void] {
  const [setRectRef, rect] = useRect(options)
  const { width, height } = useWindowSize()
  const lenis = useLenis()
  const getTransform = useTransform()

  const transformRef = useRef<WebGLTransform>({
    position: new Vector3(),
    rotation: new Euler(),
    scale: new Vector3(1, 1, 1),
    isVisible: false,
  })

  // hamo's `useEffectEvent`, not React's, on purpose (the one exception to
  // lib/hooks/README.md): it is a ref-backed wrapper with a stable identity
  // and no call-site rules, so it can be handed to `useTransform` and
  // `useLenis` and returned for a consumer's ref callback, both of which
  // React's forbids. The cost: hamo writes the ref during render, and the
  // rules-of-hooks lint cannot tell the shim from React's, hence the three
  // disables below. If hamo's shim ever adopts React's restrictions, this
  // hook is where it breaks.
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

  // oxlint-disable-next-line react-hooks/rules-of-hooks -- hamo's shim, see above
  useTransform(update, [])
  // oxlint-disable-next-line react-hooks/rules-of-hooks -- hamo's shim, see above
  useLenis(update, [])

  // Fallback for a page without Lenis. `update` is stable, so it is not a
  // dependency.
  useEffect(() => {
    if (lenis) return

    window.addEventListener('scroll', update, false)

    return () => {
      window.removeEventListener('scroll', update, false)
    }
  }, [lenis])

  // oxlint-disable-next-line react-hooks/rules-of-hooks -- hamo's shim, see above
  return [setRectRef, rect, update]
}
