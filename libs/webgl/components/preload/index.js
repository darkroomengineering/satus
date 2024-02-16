import { useProgress } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { CubeCamera, WebGLCubeRenderTarget } from 'three'

export function Preload() {
  const gl = useThree(({ gl }) => gl)
  const camera = useThree(({ camera }) => camera)
  const scene = useThree(({ scene }) => scene)

  const { active } = useProgress()

  useEffect(() => {
    if (!active) return

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
  }, [active, gl, camera, scene])
}
