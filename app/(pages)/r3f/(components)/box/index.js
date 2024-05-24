'use client'

import { useFrame } from '@darkroom.engineering/hamo'
import { OrbitControls } from '@react-three/drei'
import { useSheet } from 'libs/theatre'
import { useTheatre } from 'libs/theatre/hooks/use-theatre'
import { WebGLTunnel } from 'libs/webgl/components/tunnel'
import { useRef } from 'react'

export function Box() {
  const meshRef = useRef()

  useFrame((time) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x = time * 0.0001
    meshRef.current.rotation.y = time * 0.0001
  })

  const sheet = useSheet('webgl')
  useTheatre(
    sheet,
    'box',
    {
      x: 0,
      y: 0,
      z: 0,
    },
    {
      onValuesChange: ({ x, y, z }) => {
        if (!meshRef.current) return
        meshRef.current.position.set(x, y, z)
      },
    },
  )

  return (
    <WebGLTunnel>
      <OrbitControls />
      <mesh scale={250} ref={meshRef}>
        <boxGeometry />
        <meshNormalMaterial />
      </mesh>
    </WebGLTunnel>
  )
}
