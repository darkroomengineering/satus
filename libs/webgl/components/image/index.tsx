import { useRect } from 'hamo'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import {
  Image as DRImage,
  type ImageProps as DRImageProps,
} from '~/components/image'
import { useDeviceDetection } from '~/hooks/use-device-detection'
import { WebGLTunnel } from '../tunnel'

const WebGLImage = dynamic(
  () => import('./webgl').then(({ WebGLImage }) => WebGLImage),
  {
    ssr: false,
  }
)

export function Image({ className, ...props }: DRImageProps) {
  const [src, setSrc] = useState<string>()
  const [setRectRef, rect] = useRect()

  const { isWebGL } = useDeviceDetection()

  return (
    <>
      <WebGLTunnel>
        <WebGLImage rect={rect} src={src} />
      </WebGLTunnel>
      <div
        className={className}
        style={{
          opacity: src && isWebGL ? 0 : 1,
          position: 'relative',
        }}
        ref={setRectRef}
      >
        <DRImage
          {...props}
          onLoad={(img) => {
            setSrc(img.currentTarget.currentSrc)
          }}
          fill
        />
      </div>
    </>
  )
}
