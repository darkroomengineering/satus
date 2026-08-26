import { useFrame, useThree } from '@react-three/fiber'
import { CopyPass, EffectComposer, RenderPass } from 'postprocessing'
import { useEffect, useRef, useState } from 'react'
import { HalfFloatType } from 'three'

/**
 * Sanctioned starter scaffold: no default consumer wires this up in the repo
 * today, enable it per-canvas via the `postprocessing` prop on WebGLCanvas.
 */
export function PostProcessing() {
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

  const [composer] = useState(
    () =>
      new EffectComposer(gl, {
        multisampling: isWebgl2 && needsAA ? maxSamples : 0,
        frameBufferType: HalfFloatType,
      })
  )

  const renderPassRef = useRef<RenderPass | null>(null)
  const copyPassRef = useRef<CopyPass | null>(null)

  useEffect(() => {
    const renderPass = new RenderPass(scene, camera)
    const copyPass = new CopyPass()
    renderPassRef.current = renderPass
    copyPassRef.current = copyPass

    composer.addPass(renderPass)
    composer.addPass(copyPass)

    return () => {
      composer.removePass(renderPass)
      composer.removePass(copyPass)
      renderPass.dispose()
      copyPass.dispose()
    }
  }, [composer, scene, camera])

  useEffect(() => {
    return () => {
      composer.dispose()
    }
  }, [composer])

  useEffect(() => {
    const initialDpr = Math.min(window.devicePixelRatio, 2)

    const dpr = size.width <= 2048 ? initialDpr : 1
    setDpr(dpr)

    composer.setSize(size.width, size.height)
    // Recompute MSAA sample count for the new dpr — `needsAA`/`maxSamples`
    // were only read once, in the useState initializer above, so a resize
    // that changes dpr (e.g. moving the window to another display) never
    // updated the composer's actual sample count.
    // react-doctor-disable-next-line react-hooks-js/immutability
    composer.multisampling = isWebgl2 && dpr < 2 ? maxSamples : 0 // oxlint-disable-line react/immutability -- imperative GPU work on a state-held composer whose identity never changes
  }, [composer, size, setDpr, isWebgl2, maxSamples])

  useFrame((_, deltaTime) => {
    composer.render(deltaTime)
  }, Number.POSITIVE_INFINITY)

  return null
}
