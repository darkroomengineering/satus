import { useFrame, useThree } from '@react-three/fiber'
import {
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
} from 'postprocessing'
import { createContext, useEffect, useMemo } from 'react'

export const PostProcessingContext = createContext()

export function PostProcessing({ children }) {
  const { gl, viewport, camera, scene, size } = useThree()

  const isWebgl2 = useMemo(() => gl.capabilities.isWebGL2, [gl])
  const dpr = useMemo(() => viewport.dpr, [viewport])
  const maxSamples = useMemo(() => gl.capabilities.maxSamples, [gl])
  const needsAA = useMemo(() => dpr < 2, [dpr])

  const composer = useMemo(
    () =>
      new EffectComposer(gl, {
        multisampling: isWebgl2 && needsAA ? maxSamples : 0,
      }),
    [gl, needsAA, isWebgl2, maxSamples]
  )

  const renderPass = useMemo(
    () => new RenderPass(scene, camera),
    [scene, camera]
  )

  const chromaticAberrationEffect = useMemo(
    () => new ChromaticAberrationEffect(),
    []
  )

  const effectPass = useMemo(
    () => new EffectPass(camera, chromaticAberrationEffect),
    [camera, chromaticAberrationEffect]
  )

  useEffect(() => {
    composer.addPass(renderPass)
    composer.addPass(effectPass)

    return () => {
      composer.removePass(renderPass)
      composer.removePass(effectPass)
    }
  }, [composer, renderPass, effectPass])

  useEffect(() => {
    const { width, height } = size
    composer.setSize(width, height)
  }, [composer, size])

  useFrame((_, deltaTime) => {
    composer.render(deltaTime)
  }, 1)

  return (
    <PostProcessingContext.Provider
      value={{
        composer,
      }}
    >
      {children}
    </PostProcessingContext.Provider>
  )
}
