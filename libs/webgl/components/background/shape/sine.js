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
    uniform float uRythm;

    void main() {
        float time = (uTimeRythm * uRythmTimeScale) + (uTime * uTimeScale);
        float sinus = sin((((vUv.x * PI) + time) * uFrequency)) * uAmplitude;

        float shapeCenter = sinus + uOffsetY;

        float fadeStart = shapeCenter + uFade;
        float fadeEnd = shapeCenter - uFade;
        // float shape = vUv.y > shapeCenter ? 1. : 0.;
        float shape = mapRange(fadeStart, fadeEnd, vUv.y, 1., 0.);

        
        gl_FragColor = vec4(vec3(shape,0.,0.), 1.);

        gl_FragColor.rgb /= gl_FragColor.a;
    }
`

class SineMaterial extends ShaderMaterial {
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

  set rythm(value) {
    this.uniforms.uRythm.value = value
  }
}

export const SineTexture = forwardRef(function NoiseTexture(
  { theatreKey = 'sine' },
  ref,
) {
  const [material] = useState(() => new SineMaterial())

  const sheet = useCurrentSheet()

  useTheatre(
    sheet,
    theatreKey,
    {
      speed: types.number(1, { range: [0, 2], nudgeMultiplier: 0.01 }),
      rythm: types.number(1, { range: [0, 2], nudgeMultiplier: 0.01 }),
      amplitude: types.number(0.1, { range: [0, 0.5], nudgeMultiplier: 0.01 }),
      frequency: types.number(3, { range: [0, 10], nudgeMultiplier: 0.1 }),
      offsetY: types.number(0.5, { range: [0, 1], nudgeMultiplier: 0.01 }),
      fade: types.number(0.1, { range: [0.01, 0.5], nudgeMultiplier: 0.01 }),
    },
    {
      onValuesChange: ({
        speed,
        rythm,
        amplitude,
        frequency,
        offsetY,
        fade,
      }) => {
        material.timeScale = speed
        material.rythmTimeScale = rythm
        material.amplitude = amplitude
        material.frequency = frequency
        material.offsetY = offsetY
        material.fade = fade
      },
      deps: [material],
    },
  )

  useImperativeHandle(ref, () => ({ material }))
})
