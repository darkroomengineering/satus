'use client'

import { Center } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Rect } from 'hamo'
import { useEffect, useRef, useState } from 'react'
import type { Group, Object3D } from 'three'
import { Box3, Vector3 } from 'three'
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
  const rotationRef = useRef<Group | null>(null)
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

  // Normalized scale for the model (calculated once when loaded)
  const [modelTransform, setModelTransform] = useState<{
    scale: number
  } | null>(null)

  // Calculate normalization when gltf loads
  useEffect(() => {
    if (gltf?.scene) {
      modelRef.current = gltf.scene

      // Reset any existing transforms on the scene root
      gltf.scene.position.set(0, 0, 0)
      gltf.scene.rotation.set(0, 0, 0)
      gltf.scene.scale.set(1, 1, 1)
      gltf.scene.updateMatrixWorld(true)

      // Calculate bounding box to normalize the model to unit cube
      const box = new Box3().setFromObject(gltf.scene)
      const size = new Vector3()
      box.getSize(size)

      // Scale to fit in unit cube (Center component handles centering)
      const maxDimension = Math.max(size.x, size.y, size.z)
      setModelTransform({
        scale: maxDimension > 0 ? 1 / maxDimension : 1,
      })
    }
  }, [gltf])

  // Slow rotation animation (applied to centered model, not outer group)
  useFrame(({ clock }) => {
    if (!(visible && rotationRef.current)) return

    const time = clock.getElapsedTime()
    // Gentle rotation around Y axis
    rotationRef.current.rotation.y = time * 0.5
  })

  // Position the model in screen space (same as Box component)
  const getTransform = useWebGLRect(
    rect,
    ({ scale, position }) => {
      if (!groupRef.current) return
      groupRef.current.position.set(position.x, position.y, position.z)
      groupRef.current.scale.setScalar(scale.x)
      groupRef.current.updateMatrix()
    },
    { visible }
  )

  // Don't render anything while loading, on error, or before transform is calculated
  if (!gltf || error || !modelTransform) {
    return null
  }

  const { scale: normScale } = modelTransform

  return (
    <group
      matrixAutoUpdate={false}
      ref={(node) => {
        groupRef.current = node
        if (node) {
          // Apply initial transform since useWebGLRect may have already run
          const { scale, position } = getTransform()
          node.position.set(position.x, position.y, position.z)
          node.scale.setScalar(scale.x)
          node.updateMatrix()
        }
      }}
    >
      {/* 3-point lighting setup for GLTF materials (canvas has no default lights) */}
      <ambientLight intensity={0.5} />
      {/* Key light - main illumination from front-right-top */}
      <directionalLight position={[1, 2, 2]} intensity={1.5} />
      {/* Fill light - softer from front-left */}
      <directionalLight position={[-2, 1, 2]} intensity={0.8} />
      {/* Rim/back light for edge definition */}
      <directionalLight position={[0, 1, -2]} intensity={0.5} />

      {/* Scale to fit unit cube */}
      <group scale={normScale}>
        {/* Center the model precisely, then apply rotation */}
        <Center precise>
          <group ref={rotationRef}>
            <primitive object={gltf.scene} />
          </group>
        </Center>
      </group>
    </group>
  )
}
