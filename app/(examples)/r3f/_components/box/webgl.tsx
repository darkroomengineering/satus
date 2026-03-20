'use client'

import { useFrame } from '@react-three/fiber'
import type { Rect } from 'hamo'
import type { MutableRefObject } from 'react'
import { useRef } from 'react'
import type { Mesh } from 'three'
import { useCurrentSheet } from '@/dev/theatre'
import { useTheatre } from '@/dev/theatre/hooks/use-theatre'
import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'

interface WebGLBoxProps {
  theatreKey?: string
  rect: Rect
  visible?: boolean
  progressRef: MutableRefObject<number>
}

export function WebGLBox({
  theatreKey = 'box',
  rect,
  visible = true,
  progressRef,
}: WebGLBoxProps) {
  const meshRef = useRef<Mesh | null>(null)

  useFrame(() => {
    if (!(visible && meshRef.current)) return

    const rotation = progressRef.current * Math.PI * 4
    meshRef.current.rotation.x = rotation
    meshRef.current.rotation.y = rotation
    meshRef.current.updateMatrix()
  })

  const sheet = useCurrentSheet()
  useTheatre(
    sheet,
    theatreKey,
    {
      x: 0,
      y: 0,
      z: 0,
    },
    {
      onValuesChange: ({ x, y, z }) => {
        meshRef.current?.position.set(x, y, z)
      },
    }
  )

  useWebGLRect(
    rect,
    ({ scale, position, rotation }) => {
      meshRef.current?.position.set(position.x, position.y, position.z)
      meshRef.current?.rotation.set(rotation.x, rotation.y, rotation.z)
      meshRef.current?.scale.setScalar(scale.x)
      meshRef.current?.updateMatrix()
    },
    { visible }
  )

  return (
    <mesh
      matrixAutoUpdate={false}
      ref={(node) => {
        meshRef.current = node
        node?.updateMatrix()
      }}
    >
      <boxGeometry />
      <meshNormalMaterial />
    </mesh>
  )
}
