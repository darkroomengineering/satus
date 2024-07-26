import { useWindowSize } from '@darkroom.engineering/hamo'
import { useFrame, useThree } from '@react-three/fiber'
import { CopyPass, EffectComposer, RenderPass } from 'postprocessing'
import { useEffect, useMemo } from 'react'
import { HalfFloatType } from 'three'

export function PostProcessing() {
  const { gl, viewport, camera, scene, setDpr } = useThree()

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
    [gl, needsAA, isWebgl2, maxSamples],
  )

  const renderPass = useMemo(
    () => new RenderPass(scene, camera),
    [scene, camera],
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

  const { width: windowWidth, height: windowHeight } = useWindowSize()

  useEffect(() => {
    // reduce dpr as window width>2048 increases to maintain performance
    const initialDpr = Math.min(window.devicePixelRatio, 2)
    // let dpr = mapRange(2048, 4096, windowWidth, initialDpr, 1)
    // dpr = clamp(1, dpr, 2)
    // setDpr(dpr)

    const dpr = windowWidth <= 2048 ? initialDpr : 1
    setDpr(dpr)

    composer.setSize(windowWidth, windowHeight)
  }, [composer, windowWidth, windowHeight])

  useFrame((_, deltaTime) => {
    composer.render(deltaTime)
  }, Infinity)
}
