import { types } from '@theatre/core'
import { useCurrentSheet } from 'libs/theatre'
import { useTheatre } from 'libs/theatre/hooks/use-theatre'
import { FUNCTIONS } from 'libs/webgl/utils/functions'
import { NOISE } from 'libs/webgl/utils/noise'
import { forwardRef, useImperativeHandle, useState } from 'react'
import { ShaderMaterial } from 'three'

// @refresh reset

const vertexShader = /*glsl*/ `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const fragmentShader = /*glsl*/ `
    ${FUNCTIONS.PI}
    ${NOISE.PERLIN_3D('perlin3d')}
    ${FUNCTIONS.MAP_RANGE}
    
    varying vec2 vUv;

    uniform float uTime;
    uniform float uTimeRythm;
    uniform float uAmplitude;
    uniform float uFrequency;
    uniform float uTimeScale;
    uniform float uRythmTimeScale;
    uniform float uOffsetY;
    uniform float uFade;
    uniform float uNoiseFrequency;
    uniform float uNoiseAmplitude;
    uniform float uRythm;

    void main() {
        float time = (uTimeRythm * uRythmTimeScale) + (uTime * uTimeScale);
        // float time = 0.;

        vec2 uv = vUv;

        if(uv.y < 0.5) {
            uv.y = 1. - uv.y;
        }

        float rythm = (1. + uRythm * uRythmTimeScale);
        float sinus = abs(sin(((uv.x * PI) * uFrequency))) * uAmplitude * rythm;

        float noise = perlin3d(vec3(uv.x * uNoiseFrequency, time, 0.)) * uNoiseAmplitude;

        float shapeCenter = sinus + noise + uOffsetY;

        float fadeStart = shapeCenter - uFade;
        float fadeEnd = shapeCenter + uFade;
        // float shape = uv.y < shapeCenter ? 1. : 0.;
        float shape = mapRange(fadeStart, fadeEnd, uv.y, 1., 0.);

        
        gl_FragColor = vec4(vec3(shape,0.,0.), 1.);

        gl_FragColor.rgb /= gl_FragColor.a;
    }
`

class EnvelopeMaterial extends ShaderMaterial {
  constructor() {
    super({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: Math.random() * 1000 },
        uTimeRythm: { value: Math.random() * 1000 },
        uTimeScale: { value: 1 },
        uRythmTimeScale: { value: 1 },
        uAmplitude: { value: 0.5 },
        uFrequency: { value: 3 },
        uOffsetY: { value: 0.5 },
        uFade: { value: 0.01 },
        uNoiseFrequency: { value: 8 },
        uNoiseAmplitude: { value: 0.1 },
        uRythm: { value: 0 },
      },
      transparent: true,
    })
  }

  set amplitude(value) {
    this.uniforms.uAmplitude.value = value
  }

  set frequency(value) {
    this.uniforms.uFrequency.value = value
  }

  set timeScale(value) {
    this.uniforms.uTimeScale.value = value
  }

  set rythmTimeScale(value) {
    this.uniforms.uRythmTimeScale.value = value
  }

  set offsetY(value) {
    this.uniforms.uOffsetY.value = value
  }

  set fade(value) {
    this.uniforms.uFade.value = value
  }

  set noiseFrequency(value) {
    this.uniforms.uNoiseFrequency.value = value
  }

  set noiseAmplitude(value) {
    this.uniforms.uNoiseAmplitude.value = value
  }

  set rythm(value) {
    this.uniforms.uRythm.value = value
  }
}

export const EnvelopeTexture = forwardRef(function EnvelopeTexture(
  { theatreKey = 'envelope' },
  ref,
) {
  const [material] = useState(() => new EnvelopeMaterial())

  const sheet = useCurrentSheet()

  useTheatre(
    sheet,
    theatreKey,
    {
      speed: types.number(1, { range: [0, 2], nudgeMultiplier: 0.01 }),
      rythm: types.number(1, { range: [0, 2], nudgeMultiplier: 0.01 }),
      amplitude: types.number(0.1, { range: [0, 0.5], nudgeMultiplier: 0.01 }),
      frequency: types.number(2, { range: [0, 10], nudgeMultiplier: 0.1 }),
      offsetY: types.number(0.5, { range: [0, 1], nudgeMultiplier: 0.01 }),
      fade: types.number(0.1, { range: [0.01, 0.5], nudgeMultiplier: 0.01 }),
      noiseFrequency: types.number(8, { range: [0, 10], nudgeMultiplier: 0.1 }),
      noiseAmplitude: types.number(0.1, {
        range: [0, 1],
        nudgeMultiplier: 0.01,
      }),
    },
    {
      onValuesChange: ({
        speed,
        rythm,
        amplitude,
        frequency,
        offsetY,
        fade,
        noiseFrequency,
        noiseAmplitude,
      }) => {
        material.timeScale = speed
        material.rythmTimeScale = rythm
        material.amplitude = amplitude
        material.frequency = frequency
        material.offsetY = offsetY
        material.fade = fade
        material.noiseFrequency = noiseFrequency
        material.noiseAmplitude = noiseAmplitude
      },
      deps: [material],
    },
  )

  useImperativeHandle(ref, () => ({ material }))
})
