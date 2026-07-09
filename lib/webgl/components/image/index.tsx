'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import {
  Image as DRImage,
  type ImageProps as DRImageProps,
} from '@/components/ui/image'
import { useDeviceDetection } from '@/hooks/use-device-detection'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'
import { WebGLTunnel } from '../tunnel'

const WebGLImage = dynamic(
  () => import('./webgl').then(({ WebGLImage }) => WebGLImage),
  {
    ssr: false,
  }
)

/**
 * WebGL-enhanced Image component with visibility optimizations.
 *
 * Uses useWebGLElement for unified rect + visibility tracking.
 * Falls back to standard image on non-WebGL devices.
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
  const { setRef, rect, isVisible } = useWebGLElement<HTMLDivElement>()
  const { isWebGL } = useDeviceDetection()

  return (
    <div
      className={className}
      style={{
        opacity: src && isWebGL ? 0 : 1,
        position: 'relative',
      }}
      ref={setRef}
    >
      <WebGLTunnel>
        <WebGLImage rect={rect} src={src} visible={isVisible} />
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
