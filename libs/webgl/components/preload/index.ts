'use client'

import { useProgress } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useDebounce } from 'react-use'
import type * as THREE from 'three'
import { CubeCamera, WebGLCubeRenderTarget } from 'three'

export function Preload() {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const active = useProgress((state) => state.active)

  useDebounce(
    async () => {
      if (active) return

      console.log('Preloading...')

      const invisible: THREE.Object3D[] = []
      scene.traverse((object: any) => {
        if (object.visible === false) {
          invisible.push(object)
          object.visible = true
        }
      })
      await gl.compileAsync(scene, camera)
      const cubeRenderTarget = new WebGLCubeRenderTarget(128)
      const cubeCamera = new CubeCamera(0.01, 100000, cubeRenderTarget)
      cubeCamera.update(gl as any, scene as any)
      cubeRenderTarget.dispose()

      for (const object of invisible) {
        object.visible = false
      }

      console.timeEnd('Preload')
    },
    500,
    [active, gl, camera, scene]
  )

  return null
}
