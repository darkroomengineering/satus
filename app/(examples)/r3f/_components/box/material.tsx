import {
  MeshBasicMaterial,
  type MeshBasicMaterialParameters,
  type WebGLProgramParametersWithUniforms,
} from 'three'

// install glsl-literal https://marketplace.visualstudio.com/items?itemName=boyswan.glsl-literal

const RANDOM = Math.random()

interface OptionsType extends MeshBasicMaterialParameters {}

export class GenericMaterial extends MeshBasicMaterial {
  uniforms: {
    uTime: { value: number }
  }
  defines?: Record<string, string>
  options?: OptionsType

  constructor({ ...props }: OptionsType = {}) {
    super({ ...props })

    this.uniforms = {
      uTime: { value: 0 },
    }

    this.defines = {}

    this.customProgramCacheKey = () =>
      this.constructor.name +
      JSON.stringify(props) +
      (process.env.NODE_ENV === 'development' && RANDOM) // allow HMR
  }

  onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    console.log(`WebGL: compiling ${this.constructor.name}`)

    // uniforms
    shader.uniforms = {
      ...shader.uniforms,
      ...this.uniforms,
    }

    // defines
    shader.defines = {
      ...shader.defines,
      ...this.defines,
    }

    // vertex shader
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      /*glsl*/ `      
            void main() {
          `
    )

    // fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      /*glsl*/ `
            void main() {
          `
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      /*glsl*/ `
            vec4 diffuseColor = vec4( diffuse, opacity );
          `
    )
  }
}
