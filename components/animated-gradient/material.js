import { FUNCTIONS } from 'libs/webgl/utils/functions'
import { NOISE } from 'libs/webgl/utils/noise'
import { ShaderMaterial, Vector2 } from 'three'

const vertexShader = /* glsl */ `
    varying vec2 vUv;
    uniform vec2 uAspect;

    void main() {
      vUv = uv;
      vUv += (uAspect - 1.) * 0.5;
      vUv /= uAspect;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const fragmentShader = /* glsl */ `
    ${NOISE.FBM_3D(1)}
    ${FUNCTIONS.MAP_RANGE}

    varying vec2 vUv;

    uniform vec2 uAspect;
    uniform float uColorAmplitude;
    uniform float uColorFrequency;
    uniform float uAmplitude;
    uniform float uFrequency;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec3 uColor;
    uniform sampler2D uColorsTexture;
    uniform float uOffset;

    void main() {
      vec2 screenUV = gl_FragCoord.xy / uResolution.xy;
      screenUV += (uAspect - 1.) * 0.5;
      screenUV /= uAspect;

      float noiseColor = fbm(vec3(screenUV * uColorFrequency, (uTime + uOffset + 1000.)));
      noiseColor *= uColorAmplitude;
      noiseColor = clamp(noiseColor, 0., 1.);

      vec3 color = texture2D(uColorsTexture, vec2(0.,noiseColor)).rgb;

      float noiseAlpha = fbm(vec3(screenUV * uFrequency, uTime + uOffset));
      noiseAlpha *= uAmplitude;
      noiseAlpha = clamp(noiseAlpha, 0., 1.);

      #ifdef RADIAL
        float radialGradient = 1. - distance(vUv, vec2(0.5)) * 2.;
        radialGradient = smoothstep(0., 1., radialGradient);
        radialGradient = clamp(radialGradient, 0., 1.);
        noiseAlpha *= radialGradient;
      #endif
      

      gl_FragColor = vec4(color, noiseAlpha);

    //   gl_FragColor = texture2D(uColorsTexture, screenUV);

    //   gl_FragColor = vec4(color, 1.);
    }
`

export class AnimatedGradientMaterial extends ShaderMaterial {
  constructor({
    frequency = 0.5,
    amplitude = 1,
    colorAmplitude = 2,
    colorFrequency = 0.5,
    radial = false,
  } = {}) {
    super({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uFrequency: { value: frequency },
        uResolution: { value: new Vector2(0, 0) },
        uAspect: { value: new Vector2(1, 1) },
        uColorAmplitude: { value: colorAmplitude },
        uColorFrequency: { value: colorFrequency },
        uColorsTexture: { value: null },
        uOffset: { value: radial ? Math.random() * 1000 : 0 },
      },
      defines: {
        RADIAL: radial ? true : false,
      },
    })

    this.resolution = this.uniforms.uResolution.value
    this.aspect = this.uniforms.uAspect.value
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
}
