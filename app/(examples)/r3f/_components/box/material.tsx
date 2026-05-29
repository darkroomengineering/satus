import type { MeshBasicMaterialParameters } from 'three'
import { uniform } from 'three/tsl'
import { MeshBasicNodeMaterial } from 'three/webgpu'

interface OptionsType extends MeshBasicMaterialParameters {}

export class GenericMaterial extends MeshBasicNodeMaterial {
  // Exposed as a uniforms-shape-compatible field so callers using
  // .uniforms.uTime.value = ... continue to work unchanged.
  readonly uniforms: {
    uTime: { value: number }
  }

  private readonly _uTime = uniform(0)

  constructor({ ...props }: OptionsType = {}) {
    super({ ...props })

    if (process.env.NODE_ENV === 'development') {
      console.log(`WebGPU: compiling ${this.constructor.name}`)
    }

    // Expose a legacy-compatible uniforms object that proxies the TSL node
    const uTimeNode = this._uTime
    this.uniforms = {
      uTime: {
        get value() {
          return uTimeNode.value as number
        },
        set value(v: number) {
          uTimeNode.value = v
        },
      },
    }
  }
}
