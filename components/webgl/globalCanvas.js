import { GlobalCanvas as Canvas } from '@14islands/r3f-scroll-rig'
import { Environment } from '@react-three/drei'
import { Raf } from 'components/webgl'
import dynamic from 'next/dynamic'
import { project } from 'pages/_app'
import { useEffect } from 'react'

const PostProcessing = dynamic(
  () => import('components/webgl').then(({ PostProcessing }) => PostProcessing),
  {
    ssr: false,
  }
)

const sheet = project.sheet('WebGL')

export function GlobalCanvas() {
  useEffect(() => {
    project.ready.then(() => {
      sheet.sequence.play({ iterationCount: Infinity })
    })
  }, [])

  return (
    <Canvas
      style={{ pointerEvents: 'none' }}
      gl={{
        powerPreference: 'high-performance',
        antialias: false,
        alpha: true,
        preserveDrawingBuffer: false,
      }}
      dpr={[1, 2]}
    >
      <Raf render={true} />
      <PostProcessing />
      <Environment preset="warehouse" />
    </Canvas>
  )
}
