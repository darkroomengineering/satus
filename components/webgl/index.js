import { useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useFrame } from '@studio-freight/hamo'
import { Suspense, useEffect, useRef } from 'react'
import { PostProcessing } from './post-processing'
import { Raf } from './raf'

// https://docs.pmnd.rs/

// function PostProcessing({ children }) {
//   const { gl, viewport } = useThree()

//   const isWebgl2 = useMemo(() => gl.capabilities.isWebGL2, [gl])
//   const dpr = useMemo(() => viewport.dpr, [viewport])
//   const maxSamples = useMemo(() => gl.capabilities.maxSamples, [gl])
//   const needsAntialias = useMemo(() => dpr < 2, [dpr])

//   return (
//     <EffectComposer multisampling={isWebgl2 && needsAntialias ? maxSamples : 0}>
//       {children}
//       {!isWebgl2 && needsAntialias && <SMAA />}
//     </EffectComposer>
//   )
// }

function Demo() {
  const ref = useRef()

  useFrame(() => {
    ref.current.rotation.x = ref.current.rotation.y += 0.01
  })

  return (
    <>
      <mesh
        ref={ref}
        onClick={() => console.log('click')}
        onPointerOver={() => console.log('hover')}
        onPointerOut={() => console.log('unhover')}
      >
        <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
        <meshNormalMaterial attach="material" />
      </mesh>
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

  return (
    <Canvas
      gl={{
        powerPreference: 'high-performance',
        antialias: false,
        alpha: true,
      }}
      dpr={[1, 2]}
    >
      <Raf render={true} />
      <Suspense>
        <PostProcessing>
          <Demo />
        </PostProcessing>
      </Suspense>
    </Canvas>
  )
}
