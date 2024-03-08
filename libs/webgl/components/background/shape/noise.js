import { types } from '@theatre/core'
import { useCurrentSheet } from 'libs/theatre'
import { useTheatre } from 'libs/theatre/hooks/use-theatre'
import { FUNCTIONS } from 'libs/webgl/utils/functions'
import { NOISE } from 'libs/webgl/utils/noise'
import { forwardRef, useImperativeHandle, useState } from 'react'
import { ShaderMaterial } from 'three'

const vertexShader = /*glsl*/ `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const fragmentShader = /*glsl*/ `
    ${NOISE.PERLIN_3D('perlin3d')}
    ${FUNCTIONS.MAP_RANGE}
    
    varying vec2 vUv;

    uniform float uTime;
    uniform float uTimeRythm;
    uniform float uAmplitude;
    uniform float uFrequency;
    uniform float uTimeScale;
    uniform float uRythmTimeScale;

    void main() {
        float time = (uTimeRythm * uRythmTimeScale) + (uTime * uTimeScale);
        float noise = perlin3d(vec3(vUv * uFrequency, time)) ;
        noise = mapRange(-0.33, 1.0, noise, 0.0, 1.0);
        noise = clamp(noise, 0.0, 1.0);
        noise = smoothstep(0.0, 0.5, noise);
        noise *= uAmplitude;
        
        gl_FragColor = vec4(vec3(noise,0.,0.), 1.);

        gl_FragColor.rgb /= gl_FragColor.a;
    }
`

class NoiseMaterial extends ShaderMaterial {
  constructor() {
    super({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: Math.random() * 1000 },
        uTimeRythm: { value: Math.random() * 1000 },
        uAmplitude: { value: 1 },
        uFrequency: { value: 1 },
        uTimeScale: { value: 1 },
        uRythmTimeScale: { value: 1 },
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
}

export const NoiseTexture = forwardRef(function NoiseTexture(
  { theatreKey = 'noise' },
  ref,
) {
  const [material] = useState(() => new NoiseMaterial())

  const sheet = useCurrentSheet()

  useTheatre(
    sheet,
    theatreKey,
    {
      amplitude: types.number(1, { range: [0, 10], nudgeMultiplier: 0.1 }),
      frequency: types.number(1, { range: [0, 10], nudgeMultiplier: 0.1 }),
      speed: types.number(1, { range: [0, 2], nudgeMultiplier: 0.01 }),
      rythm: types.number(1, { range: [0, 2], nudgeMultiplier: 0.01 }),
    },
    {
      onValuesChange: ({ amplitude, frequency, speed, rythm }) => {
        material.amplitude = amplitude
        material.frequency = frequency
        material.timeScale = speed
        material.rythmTimeScale = rythm
      },
      deps: [material],
    },
  )

  useImperativeHandle(ref, () => ({ material }))
})
