import {
  type ExtendedDOMRect,
  useObjectFit,
  useWindowSize,
} from '@darkroom.engineering/hamo'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, LinearFilter, type Mesh } from 'three'
import { useFlowmap } from '~/libs/webgl/components/flowmap'
import { useWebGLRect } from '~/libs/webgl/hooks/use-webgl-rect'
import { AnimatedGradientMaterial } from './material'

// @refresh reset

function useGradient(colors: string[]) {
  const [canvas] = useState(() => document.createElement('canvas'))
  const texture = useMemo(() => {
    // @ts-expect-error - maybe three types are wrong?
    const texture = new CanvasTexture(canvas, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
    })

    return texture
  }, [canvas])

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)

    if (colors.length > 1) {
      colors.forEach((color, i) => {
        gradient.addColorStop(i / (colors.length - 1), color)
      })
      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = colors[0]
    }

    ctx.fillRect(0, 0, canvas.width, canvas.height)

    texture.needsUpdate = true
  }, [colors, texture, canvas])

  return texture
}

type WebGLAnimatedGradientProps = {
  rect: ExtendedDOMRect
  amplitude?: number
  frequency?: number
  colorAmplitude?: number
  colorFrequency?: number
  quantize?: number
  radial?: boolean
  flowmap?: boolean
  colors?: string[]
  speed?: number
}

export function WebGLAnimatedGradient({
  rect,
  amplitude = 2,
  frequency = 0.33,
  colorAmplitude = 2,
  colorFrequency = 0.33,
  quantize = 0,
  radial = false,
  flowmap = true,
  colors = ['#ff0000', '#000000'],
  speed = 1,
}: WebGLAnimatedGradientProps) {
  const [material] = useState(
    () =>
      new AnimatedGradientMaterial({
        amplitude,
        frequency,
        colorAmplitude,
        colorFrequency,
        quantize,
        radial,
        flowmap,
      })
  )

  const getFlowmap = useFlowmap()

  useFrame(() => {
    const flowmap = getFlowmap()
    material.flowmap = flowmap || null
  })

  const gradientTexture = useGradient(colors)

  useEffect(() => {
    material.colorsTexture = gradientTexture
  }, [material, gradientTexture])

  useEffect(() => {
    material.quantize = quantize
  }, [material, quantize])

  useEffect(() => {
    material.colorFrequency = colorFrequency
  }, [material, colorFrequency])

  useEffect(() => {
    material.colorAmplitude = colorAmplitude
  }, [material, colorAmplitude])

  useEffect(() => {
    material.amplitude = amplitude
  }, [material, amplitude])

  useEffect(() => {
    material.frequency = frequency
  }, [material, frequency])

  const aspect = useObjectFit(rect.width, rect.height, 1, 1, 'contain')

  useEffect(() => {
    material.aspect.set(aspect[0], aspect[1])
  }, [material, aspect])

  const { width: windowWidth = 0, height: windowHeight = 0 } = useWindowSize()

  useEffect(() => {
    material.resolution.set(windowWidth, windowHeight)
  }, [material, windowWidth, windowHeight])

  const viewport = useThree((state) => state.viewport)

  useEffect(() => {
    console.log(viewport.dpr)
    material.dpr = viewport.dpr
  }, [material, viewport])

  const meshRef = useRef<Mesh>(null!)

  useWebGLRect(rect, ({ scale, position, rotation }) => {
    meshRef.current.position.set(position.x, position.y, position.z)
    meshRef.current.rotation.set(rotation.x, rotation.y, rotation.z)
    meshRef.current.scale.set(scale.x, scale.y, scale.z)
    meshRef.current.updateMatrix()
  })

  useFrame(({ clock }) => {
    material.time = clock.getElapsedTime() * speed * 0.05
  })

  return (
    <mesh matrixAutoUpdate={false} ref={meshRef}>
      <planeGeometry />
      <primitive object={material} />
    </mesh>
  )
}
