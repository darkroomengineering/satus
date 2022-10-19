import { useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useFrame } from '@studio-freight/hamo'
import { editable as e, SheetProvider } from '@theatre/r3f'
import { project } from 'pages/_app'
import { Suspense, useEffect, useRef } from 'react'
import { PostProcessing } from './post-processing'
import { Raf } from './raf'

// https://docs.pmnd.rs/

const sheet = project.sheet('WebGL')

function Demo() {
  const ref = useRef()

  useFrame(() => {
    ref.current.rotation.x = ref.current.rotation.y += 0.01
  })

  return (
    <>
      <e.group theatreKey="Cube">
        <mesh
          ref={ref}
          onClick={() => console.log('click')}
          onPointerOver={() => console.log('hover')}
          onPointerOut={() => console.log('unhover')}
        >
          <boxGeometry attach="geometry" args={[1, 1, 1]} />
          <meshNormalMaterial attach="material" />
        </mesh>
      </e.group>
    </>
  )
}

export function WebGL({ onLoad = () => {} }) {
  const { progress } = useProgress()

  useEffect(() => {
    if (progress === 100) {
      onLoad()
    }
  }, [progress])

  useEffect(() => {
    project.ready.then(() => {
      sheet.sequence.play({ iterationCount: Infinity })
    })
  }, [])

  return (
    <Canvas
      gl={{
        powerPreference: 'high-performance',
        antialias: false,
        alpha: true,
        preserveDrawingBuffer: true,
      }}
      dpr={[1, 2]}
    >
      <SheetProvider sheet={sheet}>
        <Raf render={true} />
        <Suspense>
          <PostProcessing>
            <Demo />
          </PostProcessing>
        </Suspense>
      </SheetProvider>
    </Canvas>
  )
}
