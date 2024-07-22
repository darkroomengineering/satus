'use client'

import { useFrame } from '@react-three/fiber'
import { useCurrentSheet } from 'libs/theatre'
import { useTheatre } from 'libs/theatre/hooks/use-theatre'
import { useWebGLRect } from 'libs/webgl/hooks/use-webgl-rect'
import { useRef } from 'react'

export function WebGLBox({ theatreKey = 'box', rect }) {
  const meshRef = useRef()

  useFrame(({ clock }) => {
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
        meshRef.current.position.set(x, y, z)
      },
    },
  )

  useWebGLRect(rect, ({ scale, position, rotation }) => {
    meshRef.current.position.set(position.x, position.y, position.z)
    meshRef.current.rotation.set(rotation.x, rotation.y, rotation.z)
    meshRef.current.scale.setScalar(scale.x)
    meshRef.current.updateMatrix()
  })

  return (
    <>
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
    </>
  )
}
