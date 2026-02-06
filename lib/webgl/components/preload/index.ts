'use client'

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type * as THREE from 'three'
import { CubeCamera, WebGLCubeRenderTarget } from 'three'

/**
 * Pre-compiles all shaders in the scene to avoid jank on first render.
 *
 * **Strategy:**
 * 1. Traverse the scene and temporarily make all invisible objects visible
 *    (so the renderer can discover their materials/shaders).
 *    Objects with `userData.debug` set to `true` are excluded from this
 *    traversal, as they are developer-only helpers that should never be
 *    compiled into the production shader cache.
 * 2. Call `renderer.compileAsync(scene, camera)` to compile every shader
 *    program in a non-blocking way.
 * 3. Create a temporary `CubeCamera` and render one update to force
 *    compilation of environment-map shaders (e.g. reflections, IBL).
 *    The cube render target is disposed immediately afterwards.
 * 4. Restore the original visibility of all objects that were toggled.
 *
 * **Note:** There is a commented-out `loaderLoaded` guard that can be
 * re-enabled to defer preloading until after a loading screen completes.
 * When enabled, add `loaderLoaded` to the effect's dependency array.
 *
 * @returns `null` -- this component renders nothing to the scene.
 */
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
