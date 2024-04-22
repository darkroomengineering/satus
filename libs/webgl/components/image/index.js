import { useRect } from '@darkroom.engineering/hamo'
import { Image as NextImage } from 'components/image'
import { useDeviceDetection } from 'hooks/use-device-detection'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { WebGLTunnel } from '../tunnel'

const WebGLImage = dynamic(
  () => import('./webgl').then(({ WebGLImage }) => WebGLImage),
  {
    ssr: false,
  },
)

export function Image({ className, ...props }) {
  const [src, setSrc] = useState()
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
        <NextImage
          {...props}
          onLoad={(img) => {
            setSrc(img.target.currentSrc)
          }}
          fill
        />
      </div>
    </>
  )
}
