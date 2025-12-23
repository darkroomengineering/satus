import {
  MeshBasicMaterial,
  type Texture,
  Vector2,
  type WebGLProgramParametersWithUniforms,
} from 'three'
import type { Flowmap } from '~/webgl/utils/flowmaps/flowmap-sim'
import type { Fluid } from '~/webgl/utils/fluid/fluid-sim'
import { NOISE } from '~/webgl/utils/noise'

export class AnimatedGradientMaterial extends MeshBasicMaterial {
  private uniforms: {
    uTime: { value: number }
    uAmplitude: { value: number }
    uFrequency: { value: number }
    uResolution: { value: Vector2 }
    uAspect: { value: Vector2 }
    uColorAmplitude: { value: number }
    uColorFrequency: { value: number }
    uColorsTexture: { value: Texture | null }
    uOffset: { value: number }
    uQuantize: { value: number }
    uFlowmap: { value: Texture | null }
    uDpr: { value: number }
  }

  defines: {
    USE_RADIAL: boolean
    USE_FLOWMAP: boolean
    USE_UV: boolean
  }

  resolution: Vector2
  aspect: Vector2

  constructor({
    frequency = 0.33,
    amplitude = 2,
    colorAmplitude = 2,
    colorFrequency = 0.33,
    quantize = 0,
    radial = false,
    flowmap,
  }: {
    frequency?: number
    amplitude?: number
    colorAmplitude?: number
    colorFrequency?: number
    quantize?: number
    radial?: boolean
    flowmap?: Flowmap | Fluid
  }) {
    super({
      transparent: true,
    })

    this.uniforms = {
      uTime: { value: 0 },
      uAmplitude: { value: amplitude },
      uFrequency: { value: frequency },
      uResolution: { value: new Vector2(0, 0) },
      uAspect: { value: new Vector2(1, 1) },
      uColorAmplitude: { value: colorAmplitude },
      uColorFrequency: { value: colorFrequency },
      uColorsTexture: { value: null },
      uOffset: { value: radial ? Math.random() * 1000 : 0 },
      uQuantize: { value: quantize },
      uFlowmap: { value: flowmap?.uniform?.value ?? null },
      uDpr: { value: 1 },
    }

    this.defines = {
      USE_RADIAL: radial,
      USE_FLOWMAP: !!flowmap,
      USE_UV: true,
    }

    this.resolution = this.uniforms.uResolution.value
    this.aspect = this.uniforms.uAspect.value
  }

  onBeforeCompile(parameters: WebGLProgramParametersWithUniforms) {
    parameters.uniforms = {
      ...parameters.uniforms,
      ...this.uniforms,
    }

    parameters.defines = {
      ...parameters.defines,
      ...this.defines,
    }

    parameters.vertexShader = parameters.vertexShader.replace(
      'void main() {',
      /* glsl */ `uniform vec2 uAspect;
      
      void main() {`
    )

    parameters.vertexShader = parameters.vertexShader.replace(
      '#include <uv_vertex>',
      /* glsl */ `
      #include <uv_vertex>
      vUv += (uAspect - 1.) * 0.5;
      vUv /= uAspect;
      `
    )

    parameters.fragmentShader = parameters.fragmentShader.replace(
      'void main() {',
      /* glsl */ `
      ${NOISE.FBM_3D(2)}

      uniform vec2 uAspect;
      uniform float uColorAmplitude;
      uniform float uColorFrequency;
      uniform float uAmplitude;
      uniform float uFrequency;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform sampler2D uColorsTexture;
      uniform float uOffset;
      uniform float uQuantize;
      uniform sampler2D uFlowmap;
      uniform float uDpr;
      
      void main() {`
    )

    parameters.fragmentShader = parameters.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      /* glsl */ `
      vec2 fragCoord = gl_FragCoord.xy;

      vec2 screenUV = fragCoord / (uResolution.xy * uDpr);
      screenUV += (uAspect - 1.) * 0.5;
      screenUV /= uAspect;

      # ifdef USE_FLOWMAP
        vec4 flow = texture2D(uFlowmap, fragCoord / (uResolution.xy * uDpr));
        flow *= 0.0025;

        screenUV += flow.rg;
      # endif

      float noiseColor = fbm(vec3(screenUV * uColorFrequency, (uTime + uOffset + 1000.)));
      noiseColor *= uColorAmplitude;
      noiseColor = clamp(noiseColor, 0., 1.);

      vec3 color = texture2D(uColorsTexture, vec2(0.,noiseColor)).rgb;

      float noiseAlpha = fbm(vec3(screenUV * uFrequency, uTime + uOffset));
      noiseAlpha *= uAmplitude;
      noiseAlpha = clamp(noiseAlpha, 0., 1.);

      #ifdef USE_RADIAL
        float radialGradient = 1. - distance(vUv, vec2(0.5)) * 2.;
        radialGradient = smoothstep(0., 1., radialGradient);
        radialGradient = clamp(radialGradient, 0., 1.);
        noiseAlpha *= radialGradient;
      #endif

      float alpha = noiseAlpha;

      if(uQuantize > 0.) {
        alpha = ceil(alpha * uQuantize) / uQuantize;
      }
      
      alpha = alpha - rand(fragCoord) * 0.05;

      vec4 diffuseColor = vec4( color, alpha );

      // diffuseColor = texture2D(uFlowmap, fragCoord / (uResolution.xy * uDpr));
      `
    )
  }

  get dpr() {
    return this.uniforms.uDpr.value
  }

  set dpr(value) {
    this.uniforms.uDpr.value = value
  }

  get time() {
    return this.uniforms.uTime.value
  }

  set time(value) {
    this.uniforms.uTime.value = value
  }

  get frequency() {
    return this.uniforms.uFrequency.value
  }

  set frequency(value) {
    this.uniforms.uFrequency.value = value
  }

  get amplitude() {
    return this.uniforms.uAmplitude.value
  }

  set amplitude(value) {
    this.uniforms.uAmplitude.value = value
  }

  set colorsTexture(value: Texture | null) {
    this.uniforms.uColorsTexture.value = value
  }

  get colorAmplitude() {
    return this.uniforms.uColorAmplitude.value
  }

  set colorAmplitude(value) {
    this.uniforms.uColorAmplitude.value = value
  }

  get colorFrequency() {
    return this.uniforms.uColorFrequency.value
  }

  set colorFrequency(value) {
    this.uniforms.uColorFrequency.value = value
  }

  get quantize() {
    return this.uniforms.uQuantize.value
  }

  set quantize(value) {
    this.uniforms.uQuantize.value = value
  }
}
