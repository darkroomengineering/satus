'use client'

import { useProgress } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useDebounce } from 'react-use'
import { CubeCamera, WebGLCubeRenderTarget } from 'three'

export function Preload() {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const active = useProgress((state) => state.active)

  useDebounce(
    () => {
      if (active) return

      console.log('Preloading...')

      console.time('Preload')

      const invisible = []
      // Find all invisible objects, store and then flip them
      scene.traverse((object) => {
        if (object.visible === false) {
          invisible.push(object)
          object.visible = true
        }
      })
      // Now compile the scene
      gl.compile(scene, camera)
      // And for good measure, hit it with a cube camera
      const cubeRenderTarget = new WebGLCubeRenderTarget(128)
      const cubeCamera = new CubeCamera(0.01, 100000, cubeRenderTarget)
      cubeCamera.update(gl, scene)
      cubeRenderTarget.dispose()
      // Flips these objects back
      invisible.forEach((object) => (object.visible = false))

      console.timeEnd('Preload')
    },
    500,
    [active, gl, camera, scene],
  )
}
