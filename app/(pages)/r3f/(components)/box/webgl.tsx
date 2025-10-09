'use client'

import { useFrame } from '@react-three/fiber'
import type { Rect } from 'hamo'
import { useRef } from 'react'
import type { Mesh } from 'three'
import { useCurrentSheet } from '~/orchestra/theatre'
import { useTheatre } from '~/orchestra/theatre/hooks/use-theatre'
import { useWebGLRect } from '~/webgl/hooks/use-webgl-rect'

export function WebGLBox({
  theatreKey = 'box',
  rect,
}: {
  theatreKey?: string
  rect: Rect
}) {
  const meshRef = useRef<Mesh | null>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const time = clock.getElapsedTime()

    meshRef.current.rotation.x = time
    meshRef.current.rotation.y = time

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

  useWebGLRect(rect, ({ scale, position, rotation }) => {
    meshRef.current?.position.set(position.x, position.y, position.z)
    meshRef.current?.rotation.set(rotation.x, rotation.y, rotation.z)
    meshRef.current?.scale.setScalar(scale.x)
    meshRef.current?.updateMatrix()
  })

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
