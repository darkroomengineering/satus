import { useFrame, useThree } from '@react-three/fiber'
import {
  CopyPass,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import { HalfFloatType } from 'three'

export type { ToneMappingMode } from 'postprocessing'

export type PostProcessingProps = {
  /**
   * Enable SMAA anti-aliasing.
   * Recommended when DPR < 2 and multisampling is not available.
   * SMAA is applied as the final effect before output.
   * @default false
   */
  smaa?: boolean
  /**
   * Enable tone mapping.
   * Pass `true` for ACES Filmic (industry standard), or specify a mode.
   * Tone mapping converts HDR to LDR and should be applied before anti-aliasing.
   * @default false
   */
  toneMapping?: boolean | ToneMappingMode
}

/**
 * PostProcessing component for the WebGL pipeline.
 *
 * Provides optional SMAA anti-aliasing and tone mapping effects.
 * Effects are applied in the correct order: RenderPass -> ToneMapping -> SMAA -> CopyPass
 *
 * Note: The `postprocessing` library does not support WebGPU.
 * When using WebGPU renderer, a dev warning will be shown and effects may not work.
 *
 * @example
 * ```tsx
 * // Basic usage with defaults
 * <PostProcessing />
 *
 * // With SMAA anti-aliasing
 * <PostProcessing smaa />
 *
 * // With ACES Filmic tone mapping
 * <PostProcessing toneMapping />
 *
 * // With specific tone mapping mode
 * import { ToneMappingMode } from 'postprocessing'
 * <PostProcessing toneMapping={ToneMappingMode.REINHARD2} />
 *
 * // Full configuration
 * <PostProcessing smaa toneMapping />
 * ```
 */
export function PostProcessing({
  smaa = false,
  toneMapping = false,
}: PostProcessingProps = {}) {
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

  // Check if renderer is WebGPU (dev warning)
  const hasWarnedRef = useRef(false)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !hasWarnedRef.current) {
      // WebGPURenderer has a different constructor name
      const isWebGPU =
        gl.constructor.name === 'WebGPURenderer' ||
        (gl as unknown as { isWebGPURenderer?: boolean }).isWebGPURenderer
      if (isWebGPU) {
        console.warn(
          '[PostProcessing] The postprocessing library does not support WebGPU. ' +
            'Effects may not work correctly. Consider using Three.js TSL-based post-processing ' +
            'for WebGPU, or set forceWebGL={true} on GlobalCanvas.'
        )
        hasWarnedRef.current = true
      }
    }
  }, [gl])

  // Determine if we should use hardware multisampling
  // Use MSAA when: WebGL2 available, needs AA, and SMAA is not explicitly enabled
  const useMultisampling = isWebgl2 && needsAA && !smaa

  // Create composer with appropriate multisampling
  const composer = useMemo(
    () =>
      new EffectComposer(gl, {
        multisampling: useMultisampling ? maxSamples : 0,
        frameBufferType: HalfFloatType,
      }),
    [gl, useMultisampling, maxSamples]
  )

  // Create passes
  const renderPass = useMemo(
    () => new RenderPass(scene, camera),
    [scene, camera]
  )
  const copyPass = useMemo(() => new CopyPass(), [])

  // Create tone mapping effect if enabled
  const toneMappingEffect = useMemo(() => {
    if (!toneMapping) return null

    const mode =
      toneMapping === true ? ToneMappingMode.ACES_FILMIC : toneMapping

    return new ToneMappingEffect({ mode })
  }, [toneMapping])

  // Create SMAA effect if enabled
  const smaaEffect = useMemo(() => {
    if (!smaa) return null

    // Use HIGH preset for quality, MEDIUM for balance
    return new SMAAEffect({
      preset: SMAAPreset.HIGH,
    })
  }, [smaa])

  // Set up passes in correct order
  useEffect(() => {
    // Clear any existing passes
    while (composer.passes.length > 0) {
      const pass = composer.passes[0]
      if (pass) composer.removePass(pass)
    }

    // 1. Render pass (always first)
    composer.addPass(renderPass)

    // 2. Tone mapping (before AA to avoid artifacts)
    if (toneMappingEffect) {
      const toneMappingPass = new EffectPass(camera, toneMappingEffect)
      composer.addPass(toneMappingPass)
    }

    // 3. SMAA (after tone mapping, before output)
    if (smaaEffect) {
      const smaaPass = new EffectPass(camera, smaaEffect)
      composer.addPass(smaaPass)
    }

    // 4. Copy pass (always last - outputs to screen)
    composer.addPass(copyPass)

    if (process.env.NODE_ENV === 'development') {
      const effects: string[] = []
      if (toneMappingEffect) effects.push('ToneMapping')
      if (smaaEffect) effects.push('SMAA')
      if (useMultisampling) effects.push(`MSAA(${maxSamples}x)`)

      console.log(
        `[PostProcessing] Enabled${effects.length > 0 ? `: ${effects.join(', ')}` : ''}`
      )
    }

    return () => {
      // Cleanup is handled by composer disposal
    }
  }, [
    composer,
    renderPass,
    copyPass,
    camera,
    toneMappingEffect,
    smaaEffect,
    useMultisampling,
    maxSamples,
  ])

  // Handle resize
  useEffect(() => {
    const initialDpr = Math.min(window.devicePixelRatio, 2)
    const newDpr = size.width <= 2048 ? initialDpr : 1
    setDpr(newDpr)

    composer.setSize(size.width, size.height)
  }, [composer, size, setDpr])

  // Render loop
  useFrame((_, deltaTime) => {
    composer.render(deltaTime)
  }, Number.POSITIVE_INFINITY)

  return null
}
