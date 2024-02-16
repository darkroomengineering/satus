import { useFrame, useThree } from '@react-three/fiber'
import { types } from '@theatre/core'
import { useCurrentSheet } from 'libs/theatre'
import { useTheatre } from 'libs/theatre/hooks/use-theatre'
import Program from 'libs/webgl/utils/program'
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { HalfFloatType, LinearFilter, WebGLRenderTarget } from 'three'
import { EnvelopeTexture } from './envelope'
import { NoiseTexture } from './noise'
import { SineTexture } from './sine'

export const Shape = forwardRef(function Shape(
  { width = 256, height = 256, theatreKey = 'shape' },
  ref,
) {
  const [material, setMaterial] = useState()

  const program = useMemo(() => {
    const program = new Program(material)

    return program
  }, [material])

  const gl = useThree(({ gl }) => gl)

  const target = useMemo(() => {
    const target = new WebGLRenderTarget(width, height, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      type: HalfFloatType,
      samples: gl.capabilities.maxSamples,
    })

    return target
  }, [gl, width, height])

  useFrame(({ gl }, deltaTime) => {
    const autoClear = gl.autoClear

    gl.autoClear = true
    gl.setRenderTarget(target)
    // gl.render(scene, camera)
    if (material) material.uniforms.uTime.value += deltaTime
    program.render(gl)

    gl.setRenderTarget(null)

    gl.autoClear = autoClear
  }, -1)

  useImperativeHandle(ref, () => ({ texture: target.texture, material }), [
    target,
    material,
  ])

  const sheet = useCurrentSheet()

  const [shape, setType] = useState()

  useTheatre(
    sheet,
    theatreKey,
    {
      type: types.stringLiteral('noise', {
        noise: 'noise',
        sine: 'sine',
        envelope: 'envelope',
      }),
    },
    {
      onValuesChange: ({ type }) => {
        setType(type)
      },
    },
  )

  return (
    <>
      {shape === 'noise' && (
        <NoiseTexture
          ref={(node) => {
            setMaterial(node?.material)
          }}
          theatreKey={`${theatreKey} / noise`}
        />
      )}

      {shape === 'sine' && (
        <SineTexture
          ref={(node) => {
            setMaterial(node?.material)
          }}
          theatreKey={`${theatreKey} / sine`}
        />
      )}

      {shape === 'envelope' && (
        <EnvelopeTexture
          ref={(node) => {
            setMaterial(node?.material)
          }}
          theatreKey={`${theatreKey} / envelope`}
        />
      )}
    </>
  )
})
