import { NOISE } from 'libs/webgl/utils/noise'
import { MeshBasicMaterial, Vector2 } from 'three'

export class AnimatedGradientMaterial extends MeshBasicMaterial {
  constructor({
    frequency = 0.33,
    amplitude = 2,
    colorAmplitude = 2,
    colorFrequency = 0.33,
    quantize = 0,
    radial = false,
    flowmap = true,
  } = {}) {
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
      uFlowmap: { value: null },
      uDpr: { value: 1 },
    }
    this.defines = {
      USE_RADIAL: radial ? true : false,
      USE_FLOWMAP: flowmap ? true : false,
      USE_UV: true,
    }

    this.resolution = this.uniforms.uResolution.value
    this.aspect = this.uniforms.uAspect.value
  }

  onBeforeCompile(shader) {
    shader.uniforms = {
      ...shader.uniforms,
      ...this.uniforms,
    }

    shader.defines = {
      ...shader.defines,
      ...this.defines,
    }

    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      /* glsl */ `uniform vec2 uAspect;
      
      void main() {`,
    )

    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      /* glsl */ `
      #include <uv_vertex>
      vUv += (uAspect - 1.) * 0.5;
      vUv /= uAspect;
      `,
    )

    shader.fragmentShader = shader.fragmentShader.replace(
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
      
      void main() {`,
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      /* glsl */ `
      vec2 fragCoord = gl_FragCoord.xy;

      vec2 screenUV = fragCoord / (uResolution.xy * uDpr);
      screenUV += (uAspect - 1.) * 0.5;
      screenUV /= uAspect;

      # ifdef USE_FLOWMAP
        vec4 flow = texture2D(uFlowmap, fragCoord / (uResolution.xy * uDpr));
        flow *= 0.00025;

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
      `,
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

  set colorsTexture(value) {
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

  get flowmap() {
    return this.uniforms.uFlowmap.value
  }

  set flowmap(value) {
    this.uniforms.uFlowmap.value = value
  }
}
