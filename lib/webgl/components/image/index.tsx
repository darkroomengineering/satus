'use client'

import { useRect } from 'hamo'
import dynamic from 'next/dynamic'
import { useState } from 'react'

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
  const [src, setSrc] = useState<string>()
  const [setRectRef, rect] = useRect()
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

  return (
    <div
      className={className}
      style={{
        opacity: src && webglActive ? 0 : 1,
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
          setSrc(img.currentTarget.currentSrc)
        }}
        fill
      />
    </div>
  )
}
