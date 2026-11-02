import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { Pass } from 'three/addons/postprocessing/Pass.js'

import { wake } from '@/webgl/utils/awake'

/**
 * Add effects here: three/addons passes such as `UnrealBloomPass` or
 * `ShaderPass`. Passes from the `postprocessing` package take their buffers in
 * the opposite order and do not work in three's output pass.
 */
function createEffects(): Pass[] {
  return []
}

/**
 * Sanctioned starter scaffold: no default consumer wires this up in the repo
 * today, enable it per-canvas via the `postprocessing` prop on WebGLCanvas.
 *
 * Effects run in three's built-in output pass (`renderer.setEffects()`). It
 * needs the half-float output buffer the `postprocessing` prop gives the
 * renderer, and multisamples the scene when the canvas antialiases. With no
 * effects and no tone mapping three skips the pass and draws straight to the
 * canvas, so the scaffold costs nothing until an effect is added.
 */
export function PostProcessing() {
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    const effects = createEffects()
    gl.setEffects(effects)
    wake()

    return () => {
      gl.setEffects(null)
      for (const effect of effects) effect.dispose()
    }
  }, [gl])

  return null
}
