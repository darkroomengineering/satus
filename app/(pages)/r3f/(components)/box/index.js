'use client'

import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@studio-freight/hamo'
import { WebGLTunnel } from 'libs/webgl/components/tunnel'
import { useRef } from 'react'

export function Box() {
  const meshRef = useRef()

  useFrame((time) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x = time * 0.0001
    meshRef.current.rotation.y = time * 0.0001
  })

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
