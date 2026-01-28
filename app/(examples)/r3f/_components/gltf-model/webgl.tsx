'use client'

import { useFrame } from '@react-three/fiber'
import type { Rect } from 'hamo'
import { useEffect, useRef, useState } from 'react'
import type { Group, Object3D } from 'three'
// disposeObject: Recursively disposes an Object3D and all its children.
// Handles geometries, materials (including arrays), textures, and ImageBitmap sources.
// Essential for GLTF cleanup to prevent memory leaks.
//
// useGLTFLoader: Returns a GLTFLoader configured with Draco and KTX2 support.
// - Draco: Reduces geometry file sizes by 90-95%
// - KTX2: GPU-compressed textures that stay compressed in VRAM (~10x savings)
import { disposeObject, type GLTF, useGLTFLoader } from '@/lib/webgl'
import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'

interface WebGLGLTFModelProps {
  rect: Rect
  visible?: boolean
  modelUrl: string
}

/**
 * WebGL GLTF model component demonstrating proper model loading and cleanup.
 *
 * Key patterns:
 * - useGLTFLoader: Hook that returns a configured GLTFLoader with Draco/KTX2.
 *   Must be inside R3F Canvas context to access the renderer.
 * - disposeObject: Called on unmount to recursively dispose the GLTF scene.
 *   This handles all child geometries, materials, textures, and ImageBitmaps.
 * - Loading state: Handle async loading gracefully with null checks.
 * - Error handling: Catch load errors to prevent crashes from missing assets.
 *
 * Note: Unlike useDisposable (for simple resources), GLTF scenes require
 * disposeObject because they contain nested hierarchies of resources.
 */
export function WebGLGLTFModel({
  rect,
  visible = true,
  modelUrl,
}: WebGLGLTFModelProps) {
  const groupRef = useRef<Group | null>(null)
  const modelRef = useRef<Object3D | null>(null)
  const [gltf, setGltf] = useState<GLTF | null>(null)
  const [error, setError] = useState<Error | null>(null)

  // useGLTFLoader returns a configured loader with Draco and KTX2 support.
  // The loader automatically detects GPU capabilities for optimal texture formats.
  const loader = useGLTFLoader()

  // Load the model
  useEffect(() => {
    let cancelled = false

    loader
      .loadAsync(modelUrl)
      .then((result) => {
        if (!cancelled) {
          setGltf(result)
          setError(null)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          // Don't crash if model is missing - log warning and continue
          console.warn(`[GLTFModel] Failed to load model: ${modelUrl}`, err)
          setError(err)
        }
      })

    // Cleanup: dispose the entire GLTF scene on unmount or URL change
    return () => {
      cancelled = true
      if (modelRef.current) {
        // disposeObject recursively disposes all:
        // - Geometries (BufferGeometry.dispose())
        // - Materials (Material.dispose() + all texture maps)
        // - Textures (Texture.dispose() + ImageBitmap.close())
        disposeObject(modelRef.current)
        modelRef.current = null
      }
    }
  }, [loader, modelUrl])

  // Update modelRef when gltf loads
  useEffect(() => {
    if (gltf?.scene) {
      modelRef.current = gltf.scene
    }
  }, [gltf])

  // Slow rotation animation
  useFrame(({ clock }) => {
    if (!(visible && groupRef.current)) return

    const time = clock.getElapsedTime()
    // Gentle rotation around Y axis
    groupRef.current.rotation.y = time * 0.5
    groupRef.current.updateMatrix()
  })

  // Position the model in screen space
  useWebGLRect(
    rect,
    ({ scale, position }) => {
      if (!groupRef.current) return
      groupRef.current.position.set(position.x, position.y, position.z)
      // Scale based on rect size
      const modelScale = scale.x * 0.8 // Slightly smaller than container
      groupRef.current.scale.setScalar(modelScale)
      groupRef.current.updateMatrix()
    },
    { visible }
  )

  // Don't render anything while loading or on error
  if (!gltf || error) {
    return null
  }

  return (
    <group
      matrixAutoUpdate={false}
      ref={(node) => {
        groupRef.current = node
        node?.updateMatrix()
      }}
    >
      {/* primitive attaches the loaded GLTF scene to the R3F tree */}
      <primitive object={gltf.scene} />
    </group>
  )
}
