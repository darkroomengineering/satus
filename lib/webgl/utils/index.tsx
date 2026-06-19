/**
 * @author pschroen / https://ufo.ai/
 * https://github.com/alienkitty/space.js/blob/main/src/three/utils/Utils3D.js
 */

import {
  BufferGeometry,
  Float32BufferAttribute,
  type IUniform,
  type RawShaderMaterial,
  type RenderTargetOptions,
  WebGLRenderTarget,
} from 'three'

export function getDoubleRenderTarget(
  width: number,
  height: number,
  options?: RenderTargetOptions
) {
  const renderTarget = {
    read: new WebGLRenderTarget(width, height, options),
    write: new WebGLRenderTarget(width, height, options),
    swap: () => {
      const temp = renderTarget.read
      renderTarget.read = renderTarget.write
      renderTarget.write = temp
    },
    setSize: (width: number, height: number) => {
      renderTarget.read.setSize(width, height)
      renderTarget.write.setSize(width, height)
    },
    dispose: () => {
      renderTarget.read.dispose()
      renderTarget.write.dispose()
    },
  }

  return renderTarget
}

export function getFullscreenTriangle() {
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3)
  )
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2))

  return geometry
}

export type DoubleRenderTarget = ReturnType<typeof getDoubleRenderTarget>

/** A RawShaderMaterial whose uniform keys are known (so accesses aren't `| undefined`). */
export type ShaderMaterial<K extends string> = RawShaderMaterial & {
  uniforms: Record<K, IUniform>
}
