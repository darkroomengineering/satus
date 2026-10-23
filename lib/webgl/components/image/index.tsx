'use client'

import { useRect } from 'hamo'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

import {
  Image as DRImage,
  type ImageProps as DRImageProps,
} from '@/components/ui/image'
import { useDeviceDetection } from '@/hooks/use-device-detection'
import { useRootCanvasMounted } from '@/webgl/components/canvas'

import { WebGLTunnel } from '../tunnel'

const WebGLImage = dynamic(
  () => import('./webgl').then(({ WebGLImage }) => WebGLImage),
  {
    ssr: false,
  }
)

/**
 * WebGL-enhanced Image component.
 *
 * The DOM image is the measured element: hamo's `useRect` measures it once
 * per resize, and `useWebGLRect` in `./webgl` places the plane on that rect
 * on scroll, transform and re-measure. Falls back to the standard image on
 * non-WebGL devices.
 */
export function Image({
  className,
  // The wrapper always renders the underlying image in `fill` mode — the
  // sizing container is this component's own positioned <div>. Strip the
  // sizing union members so the spread satisfies the `fill` branch.
  fill: _fill,
  width: _width,
  height: _height,
  aspectRatio: _aspectRatio,
  ...props
}: DRImageProps) {
  // The URL the DOM image actually loaded (`currentSrc`, after srcset).
  const [loadedUrl, setLoadedUrl] = useState<string>()
  // The cross-origin URL whose CORS probe last finished, and how it went.
  const [probed, setProbed] = useState<{ url: string; ok: boolean }>()
  // `useWebGLRect` adds any `TransformProvider` translate itself; measuring
  // through the transform would count a parallax offset twice.
  const [setRectRef, rect] = useRect({ ignoreTransform: true })
  const { isWebGL, isReducedMotion } = useDeviceDetection()

  // Hide the DOM image only when a WebGL canvas will actually render its
  // replacement. `Canvas` mounts on `isWebGL && !isReducedMotion` (see
  // components/canvas), so gating on `isWebGL` alone would blank the image for
  // a reduced-motion visitor whose canvas never mounts — the exact fallback
  // the module contract promises. `rootCanvasMounted` covers the other way
  // this can go blank: no `<Canvas root>` mounted anywhere (neither the
  // layout canvas nor a page's `<Wrapper webgl>`), which the device-capability
  // checks alone can't detect. It's reactive, so the image reappears/hides
  // correctly regardless of whether the root canvas mounts before or after
  // this component (mount order isn't guaranteed across routes).
  const rootCanvasMounted = useRootCanvasMounted()
  const webglActive = isWebGL && !isReducedMotion && rootCanvasMounted

  // A texture is read with a CORS request (three's loader sets
  // `crossOrigin = 'anonymous'`), which the DOM image never makes. A host
  // that refuses this page's origin (Sanity's CDN 403s any origin missing
  // from the project's CORS list) would leave a hidden DOM image and an
  // empty plane. So a cross-origin URL gets the same request as a probe
  // first, and the plane receives a src only once it succeeds; on failure
  // the DOM image stays visible. Cost: a cross-origin image downloads twice
  // when its host varies on `Origin`, as Sanity's CDN does (the DOM request
  // sent none), and the plane appears only after the probe finishes. It
  // runs only where the plane will render (`webglActive`), so reduced
  // motion, no WebGL and software renderers never pay it, and same-origin
  // URLs (`/_next/image`) skip it, as they can't fail CORS.
  const crossOrigin = loadedUrl !== undefined && !isSameOrigin(loadedUrl)
  useEffect(() => {
    if (!(webglActive && loadedUrl && crossOrigin)) return
    let stale = false
    const probe = document.createElement('img')
    probe.crossOrigin = 'anonymous'
    probe.onload = () => {
      if (!stale) setProbed({ url: loadedUrl, ok: true })
    }
    probe.onerror = () => {
      if (!stale) setProbed({ url: loadedUrl, ok: false })
    }
    probe.src = loadedUrl
    return () => {
      // A newer currentSrc, a lost WebGL gate or unmount: drop this result.
      stale = true
      probe.onload = null
      probe.onerror = null
    }
  }, [webglActive, loadedUrl, crossOrigin])

  const corsOk =
    !crossOrigin || (probed?.url === loadedUrl && probed.ok === true)
  const src = webglActive && loadedUrl && corsOk ? loadedUrl : undefined

  return (
    <div
      className={className}
      style={{
        opacity: src ? 0 : 1,
        position: 'relative',
      }}
      ref={setRectRef}
    >
      <WebGLTunnel>
        <WebGLImage rect={rect} src={src} />
      </WebGLTunnel>
      <DRImage
        {...props}
        onLoad={(img: React.SyntheticEvent<HTMLImageElement>) => {
          setLoadedUrl(img.currentTarget.currentSrc)
        }}
        fill
      />
    </div>
  )
}

function isSameOrigin(url: string) {
  return new URL(url, window.location.href).origin === window.location.origin
}
