import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, SMAA } from '@react-three/postprocessing'
import { Suspense, useRef } from 'react'

// https://docs.pmnd.rs/

function PostProcessing({ children }) {
  const { gl, viewport } = useThree()

  const isWebgl2 = useMemo(() => gl.capabilities.isWebGL2, [gl])
  const dpr = useMemo(() => viewport.dpr, [viewport])
  const maxSamples = useMemo(() => gl.capabilities.maxSamples, [gl])
  const needsAntialias = useMemo(() => dpr < 2, [dpr])

  return (
    <EffectComposer multisampling={isWebgl2 && needsAntialias ? maxSamples : 0}>
      {children}
      {!isWebgl2 && needsAntialias && <SMAA />}
    </EffectComposer>
  )
}

function Demo() {
  const ref = useRef()

  useFrame(() => {
    ref.current.rotation.x = ref.current.rotation.y += 0.01
  })

  return (
    <>
      <mesh
        ref={ref}
        onClick={(e) => console.log('click')}
        onPointerOver={(e) => console.log('hover')}
        onPointerOut={(e) => console.log('unhover')}
      >
        <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
        <meshNormalMaterial attach="material" />
      </mesh>
    </>
  )
}

export function WebGLDemo({ onLoad = () => {} }) {
  // const { progress } = useProgress()

  // useEffect(() => {
  //   console.log(progress)
  //   if (progress === 100) {
  //     onLoad()
  //   }
  // }, [progress])

  return (
    <Canvas>
      <Suspense>
        <Demo />
      </Suspense>
    </Canvas>
  )
}
