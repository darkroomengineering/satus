'use client'

import { useEffect, useRef } from 'react'
import type {
  BufferGeometry,
  Material,
  Object3D,
  Texture,
  WebGLRenderTarget,
} from 'three'

/**
 * Any Three.js resource that has a dispose() method.
 */
interface Disposable {
  dispose(): void
}

/**
 * Recursively disposes a Three.js Object3D and all its children.
 *
 * Handles:
 * - Geometries
 * - Materials (including arrays and texture maps)
 * - Textures (including ImageBitmap sources per Three.js Tip 38)
 * - Render targets
 * - Nested children
 *
 * @example
 * ```tsx
 * // Clean up a loaded GLTF scene
 * useEffect(() => {
 *   const gltf = await loadGLTF('/model.glb')
 *   return () => disposeObject(gltf.scene)
 * }, [])
 * ```
 *
 * @example
 * ```tsx
 * // Manual cleanup in a class
 * class MyScene {
 *   cleanup() {
 *     disposeObject(this.scene)
 *   }
 * }
 * ```
 *
 * @param object - The Three.js Object3D to dispose
 */
export function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    // Dispose geometry
    if ('geometry' in child) {
      const geometry = child.geometry as BufferGeometry | undefined
      geometry?.dispose()
    }

    // Dispose materials (handle arrays and single materials)
    if ('material' in child) {
      const materials = child.material as Material | Material[] | undefined
      if (Array.isArray(materials)) {
        for (const material of materials) {
          disposeMaterial(material)
        }
      } else if (materials) {
        disposeMaterial(materials)
      }
    }
  })
}

/**
 * Disposes a material and all its texture maps.
 *
 * @param material - The material to dispose
 */
function disposeMaterial(material: Material): void {
  // Dispose all texture maps on the material
  for (const value of Object.values(material)) {
    if (isTexture(value)) {
      disposeTexture(value)
    }
  }
  material.dispose()
}

/**
 * Type guard for textures.
 */
function isTexture(obj: unknown): obj is Texture {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'isTexture' in obj &&
    (obj as { isTexture: boolean }).isTexture === true
  )
}

/**
 * Disposes a texture and its source (handles ImageBitmap cleanup).
 *
 * Per Three.js Tip 38: ImageBitmap textures from GLTFLoader require
 * explicit cleanup of the source ImageBitmap.
 *
 * @param texture - The texture to dispose
 */
export function disposeTexture(texture: Texture): void {
  texture.dispose()

  // Handle ImageBitmap sources (Tip 38: GLTF textures use ImageBitmap)
  const source = texture.source?.data
  if (source instanceof ImageBitmap) {
    source.close()
  }
}

/**
 * Disposes a WebGLRenderTarget and its textures.
 *
 * @param target - The render target to dispose
 */
export function disposeRenderTarget(target: WebGLRenderTarget): void {
  target.dispose()
}

/**
 * Hook for automatic disposal of Three.js resources on unmount.
 *
 * Creates a resource using the factory function and automatically
 * disposes it when the component unmounts or dependencies change.
 *
 * Note: When dependencies change, the old resource is disposed and a new one
 * is created on the next render. This follows useMemo-like semantics.
 *
 * @example
 * ```tsx
 * // Auto-dispose geometry
 * const geometry = useDisposable(
 *   () => new BoxGeometry(1, 1, 1),
 *   []
 * )
 *
 * // Auto-dispose material with dependencies
 * const material = useDisposable(
 *   () => new MeshBasicMaterial({ color }),
 *   [color]
 * )
 *
 * // Auto-dispose render target
 * const target = useDisposable(
 *   () => new WebGLRenderTarget(512, 512),
 *   []
 * )
 * ```
 *
 * @param factory - Function that creates the disposable resource
 * @param deps - Dependency array (like useEffect). Resource is recreated when deps change.
 * @returns The created resource
 */
export function useDisposable<T extends Disposable>(
  factory: () => T,
  deps: React.DependencyList
): T {
  const resourceRef = useRef<T | null>(null)

  // Create or recreate resource when deps change
  if (resourceRef.current === null) {
    resourceRef.current = factory()
  }

  // Cleanup on unmount or when deps change
  useEffect(() => {
    return () => {
      resourceRef.current?.dispose()
      resourceRef.current = null
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps is intentionally passed as dynamic array like useMemo
  }, deps)

  return resourceRef.current
}

/**
 * Hook for managing multiple disposable resources.
 *
 * Useful when you need to create and dispose a group of related resources.
 *
 * @example
 * ```tsx
 * const { add, disposeAll } = useDisposableGroup()
 *
 * const geometry = add(new BoxGeometry(1, 1, 1))
 * const material = add(new MeshBasicMaterial({ color: 'red' }))
 *
 * // All resources disposed on unmount
 * ```
 *
 * @returns Object with add() and disposeAll() methods
 */
export function useDisposableGroup(): {
  add: <T extends Disposable>(resource: T) => T
  disposeAll: () => void
} {
  const resourcesRef = useRef<Set<Disposable>>(new Set())

  useEffect(() => {
    return () => {
      for (const resource of resourcesRef.current) {
        resource.dispose()
      }
      resourcesRef.current.clear()
    }
  }, [])

  return {
    add: <T extends Disposable>(resource: T): T => {
      resourcesRef.current.add(resource)
      return resource
    },
    disposeAll: () => {
      for (const resource of resourcesRef.current) {
        resource.dispose()
      }
      resourcesRef.current.clear()
    },
  }
}
