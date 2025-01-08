import { useFrame, useThree } from '@react-three/fiber'
import { CopyPass, EffectComposer, RenderPass } from 'postprocessing'
import { useEffect, useMemo } from 'react'
import { HalfFloatType } from 'three'

export function PostProcessing() {
  console.log('WebGL: PostProcessing enabled')

  const gl = useThree((state) => state.gl)
  const viewport = useThree((state) => state.viewport)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const setDpr = useThree((state) => state.setDpr)
  const size = useThree((state) => state.size)

  const isWebgl2 = gl.capabilities.isWebGL2
  const dpr = viewport.dpr
  const maxSamples = gl.capabilities.maxSamples
  const needsAA = dpr < 2

  const composer = useMemo(
    () =>
      new EffectComposer(gl, {
        multisampling: isWebgl2 && needsAA ? maxSamples : 0,
        frameBufferType: HalfFloatType,
      }),
    [gl, needsAA, isWebgl2, maxSamples]
  )

  const renderPass = useMemo(
    () => new RenderPass(scene, camera),
    [scene, camera]
  )

  const copyPass = useMemo(() => new CopyPass(), [])

  useEffect(() => {
    composer.addPass(renderPass)
    composer.addPass(copyPass)

    return () => {
      composer.removePass(renderPass)
      composer.removePass(copyPass)
    }
  }, [composer, renderPass, copyPass])

  // const { width: windowWidth = 0, height: windowHeight = 0 } = useWindowSize()

  useEffect(() => {
    const initialDpr = Math.min(window.devicePixelRatio, 2)

    const dpr = size.width <= 2048 ? initialDpr : 1
    setDpr(dpr)

    composer.setSize(size.width, size.height)
  }, [composer, size, setDpr])

  useFrame((_, deltaTime) => {
    composer.render(deltaTime)
  }, Number.POSITIVE_INFINITY)

  return null
}
