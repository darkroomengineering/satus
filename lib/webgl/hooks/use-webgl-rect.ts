'use client'

import {
  type Rect,
  useEffectEvent as useStableCallback,
  useTransform,
  useWindowSize,
} from 'hamo'
import { useLenis } from 'lenis/react'
import { useEffect, useRef } from 'react'
import { Euler, Vector3 } from 'three'

import { wake } from '@/webgl/utils/awake'

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
 * Places WebGL content on a DOM element's rect from hamo's `useRect`, combining
 * it with the scroll and any `TransformProvider` translate above the element
 * into a {@link WebGLTransform} handed to `onUpdate`.
 *
 * Event-driven, not per frame: runs on Lenis scroll events (emitted inside
 * Lenis's raf, before the canvas draws), provider transform changes, and after
 * every render of the caller (which covers first measurement and re-measures).
 * Without Lenis it listens to the window `scroll` event. A call that moves,
 * resizes, shows or hides the element wakes the canvas (see
 * `@/webgl/utils/awake`); an unchanged one does not.
 *
 * Works on either side of the tunnel. Inside the canvas the mesh is placed on
 * mount. On the DOM side the mesh can mount after the element (the root canvas
 * waits for `window.load`) with no event of its own, so use the returned
 * `update` in the mesh's ref callback.
 *
 * Size comes from hamo's `useWindowSize` (layout viewport without the
 * scrollbar), which is the size the fixed root canvas has.
 *
 * @param rect - Pass `ignoreTransform: true` to `useRect` for an element that
 *   moves under a `TransformProvider`, so its transform counts once, here.
 * @param onUpdate - The transform object is reused between calls: copy out of
 *   it, don't keep it.
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
  const placedRef = useRef(false)

  // hamo's `useEffectEvent`, renamed: unlike React's, it returns one stable
  // function that always runs the latest closure, so it may be passed to
  // subscriptions and returned. The rules-of-hooks lint applies React's
  // contract to anything named `useEffectEvent`, whatever the import.
  const update = useStableCallback(() => {
    if (width === undefined || height === undefined) return
    if (
      rect.top === undefined ||
      rect.height === undefined ||
      rect.left === undefined ||
      rect.width === undefined
    ) {
      return
    }

    const { translate, scale } = getTransform()
    // oxlint-disable-next-line hamo/no-raw-layout-read -- fallback for a page without Lenis
    const scroll = lenis ? Math.round(lenis.scroll) : window.scrollY
    const transform = transformRef.current

    // The element as placed: centre in document space plus the provider's
    // translate, half-extents with the provider's scale (applied about the
    // centre). x is viewport-relative on a vertically scrolling page.
    const centerX = rect.left + rect.width / 2 + translate.x
    const centerY = rect.top + rect.height / 2 + translate.y
    const halfWidth = (rect.width * scale.x) / 2
    const halfHeight = (rect.height * scale.y) / 2

    const isVisible =
      centerX + halfWidth > 0 &&
      centerX - halfWidth < width &&
      centerY + halfHeight > scroll &&
      centerY - halfHeight < scroll + height
    const x = -width / 2 + centerX
    const y = height / 2 - centerY + scroll
    const scaleX = rect.width * scale.x
    const scaleY = rect.height * scale.y

    // Only a placement that moved something wakes the canvas: this runs on
    // every Lenis scroll event and render, and a wake per unchanged call
    // would keep an idle canvas drawing.
    const changed =
      !placedRef.current ||
      isVisible !== transform.isVisible ||
      x !== transform.position.x ||
      y !== transform.position.y ||
      scaleX !== transform.scale.x ||
      scaleY !== transform.scale.y
    placedRef.current = true

    transform.isVisible = isVisible
    transform.position.x = x
    transform.position.y = y
    transform.scale.x = scaleX
    transform.scale.y = scaleY

    onUpdate?.(transform)
    if (changed) wake()
  })

  // After every render too: a box re-measured after a resize would otherwise
  // sit wrong until the next scroll event, which may be far off.
  useEffect(update)

  useTransform(update, [])
  useLenis(update, [])

  useEffect(() => {
    if (lenis) return

    // oxlint-disable-next-line hamo/no-raw-observer -- fallback for a page without Lenis
    window.addEventListener('scroll', update, false)

    return () => {
      window.removeEventListener('scroll', update, false)
    }
  }, [lenis, update])

  return update
}
