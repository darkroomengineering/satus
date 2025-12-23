'use client'

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type * as THREE from 'three'
import { CubeCamera, WebGLCubeRenderTarget } from 'three'

export function Preload() {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  // const loaderLoaded = useStore((state) => state.loaderLoaded)

  useEffect(() => {
    // if (!loaderLoaded) return

    async function load() {
      console.log('WebGL: Preloading...')
      console.time('WebGL: Preload took:')

      const invisible: THREE.Object3D[] = []
      scene.traverse((object: THREE.Object3D) => {
        if (object.visible === false && !object.userData?.debug) {
          invisible.push(object)
          object.visible = true
        }
      })
      await gl.compileAsync(scene, camera)
      const cubeRenderTarget = new WebGLCubeRenderTarget(128)
      const cubeCamera = new CubeCamera(0.01, 100000, cubeRenderTarget)
      cubeCamera.update(gl as THREE.WebGLRenderer, scene as THREE.Scene)
      cubeRenderTarget.dispose()

      for (const object of invisible) {
        object.visible = false
      }

      console.timeEnd('WebGL: Preload took:')
    }

    load()
  }, [
    camera,
    gl,
    scene,
    // loaderLoaded
  ])

  return null
}
