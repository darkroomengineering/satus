'use client'

/**
 * GLTF Loader Configuration with Draco and KTX2 Support
 *
 * Provides optimized asset loading for Three.js/R3F applications:
 *
 * **Draco Compression** (Tips 21, 24, 28):
 * - Reduces geometry file sizes by 90-95%
 * - Decoders loaded from Google CDN on first use
 * - Essential for production GLTF/GLB files
 *
 * **KTX2/Basis Universal** (Tips 22-23, 28):
 * - GPU-compressed textures that stay compressed in VRAM
 * - ~10x VRAM reduction compared to uncompressed textures
 * - Transcodes to optimal format based on device capabilities
 * - Requires WebGL renderer for format detection
 *
 * @example
 * ```tsx
 * // Simple async loading (auto-detects renderer in R3F context)
 * const gltf = await loadGLTF('/model.glb')
 *
 * // React hook (must be inside R3F Canvas)
 * function MyModel() {
 *   const loader = useGLTFLoader()
 *   // Use loader.loadAsync('/model.glb')
 * }
 *
 * // Factory for non-React usage
 * const loader = createGLTFLoader(renderer)
 * ```
 */

import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import type { WebGLRenderer } from 'three'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { type GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'

// ============================================================================
// CDN Paths for Decoders/Transcoders
// ============================================================================

/**
 * Google-hosted Draco decoder path.
 * Version 1.5.7 is widely compatible and well-tested.
 */
const DRACO_DECODER_PATH =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

/**
 * Google-hosted Basis Universal transcoder path.
 * Used for KTX2 texture transcoding.
 */
const BASIS_TRANSCODER_PATH =
  'https://www.gstatic.com/basis-universal/versioned/2021-04-15-ba1c3e4/'

// ============================================================================
// Singleton Loaders (Lazy Initialization)
// ============================================================================

/**
 * Singleton DRACOLoader instance.
 * Initialized once and reused across all GLTF loads.
 */
let dracoLoader: DRACOLoader | null = null

/**
 * Singleton KTX2Loader instance.
 * Initialized once and reused across all GLTF loads.
 */
let ktx2Loader: KTX2Loader | null = null

/**
 * Track which renderer has been used for KTX2 format detection.
 * KTX2Loader.detectSupport() only needs to be called once per renderer.
 */
let ktx2RendererDetected: WebGLRenderer | null = null

/**
 * Get or create the singleton DRACOLoader.
 *
 * Draco decoders are loaded from Google CDN on first use.
 * This adds a small initial latency but avoids bundling ~300KB of WASM.
 *
 * @returns Configured DRACOLoader instance
 */
function getDracoLoader(): DRACOLoader {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH)
  }
  return dracoLoader
}

/**
 * Get or create the singleton KTX2Loader.
 *
 * Requires a WebGLRenderer to detect supported GPU texture formats.
 * The transcoder is loaded from Google CDN on first use.
 *
 * KTX2 textures transcode to the optimal format for each device:
 * - Desktop: BC7/BC1 (DXT)
 * - iOS: ASTC/PVRTC
 * - Android: ASTC/ETC2
 *
 * @param renderer - WebGLRenderer for format detection
 * @returns Configured KTX2Loader instance
 */
function getKTX2Loader(renderer: WebGLRenderer): KTX2Loader {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader()
    ktx2Loader.setTranscoderPath(BASIS_TRANSCODER_PATH)
  }

  // Only call detectSupport once per renderer
  if (ktx2RendererDetected !== renderer) {
    ktx2Loader.detectSupport(renderer)
    ktx2RendererDetected = renderer
  }

  return ktx2Loader
}

// ============================================================================
// GLTF Loader Factory
// ============================================================================

/**
 * Create a configured GLTFLoader with Draco and KTX2 support.
 *
 * Use this factory for non-React contexts or when you need
 * explicit control over the loader instance.
 *
 * @param renderer - WebGLRenderer for KTX2 format detection (optional)
 * @returns Configured GLTFLoader instance
 *
 * @example
 * ```tsx
 * // With renderer (full KTX2 support)
 * const loader = createGLTFLoader(renderer)
 * const gltf = await loader.loadAsync('/model.glb')
 *
 * // Without renderer (Draco only, KTX2 will fallback)
 * const loader = createGLTFLoader()
 * const gltf = await loader.loadAsync('/model.glb')
 * ```
 */
export function createGLTFLoader(renderer?: WebGLRenderer): GLTFLoader {
  const loader = new GLTFLoader()

  // Always configure Draco support
  loader.setDRACOLoader(getDracoLoader())

  // Configure KTX2 support if renderer is available
  if (renderer) {
    loader.setKTX2Loader(getKTX2Loader(renderer))
  }

  return loader
}

// ============================================================================
// Simple Async Loader Function
// ============================================================================

/**
 * Load a GLTF/GLB file with Draco and KTX2 support.
 *
 * This is the simplest way to load optimized 3D models.
 * Creates a new loader instance for each call (for isolation),
 * but reuses the singleton Draco/KTX2 loaders.
 *
 * @param url - URL to the GLTF or GLB file
 * @param renderer - WebGLRenderer for KTX2 format detection (optional)
 * @returns Promise resolving to the loaded GLTF data
 *
 * @example
 * ```tsx
 * // Basic usage
 * const gltf = await loadGLTF('/models/character.glb')
 * scene.add(gltf.scene)
 *
 * // With renderer for KTX2 support
 * const gltf = await loadGLTF('/models/character.glb', renderer)
 *
 * // In R3F (renderer auto-obtained)
 * function MyModel() {
 *   const { gl } = useThree()
 *   const [gltf, setGltf] = useState<GLTF | null>(null)
 *
 *   useEffect(() => {
 *     loadGLTF('/model.glb', gl).then(setGltf)
 *   }, [gl])
 *
 *   if (!gltf) return null
 *   return <primitive object={gltf.scene} />
 * }
 * ```
 */
export async function loadGLTF(
  url: string,
  renderer?: WebGLRenderer
): Promise<GLTF> {
  const loader = createGLTFLoader(renderer)
  return loader.loadAsync(url)
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook that returns a configured GLTFLoader.
 *
 * Must be called within an R3F Canvas context to access the renderer
 * for KTX2 format detection.
 *
 * The loader is memoized and only recreated if the renderer changes.
 *
 * @returns Configured GLTFLoader instance
 *
 * @example
 * ```tsx
 * function MyModel() {
 *   const loader = useGLTFLoader()
 *   const [gltf, setGltf] = useState<GLTF | null>(null)
 *
 *   useEffect(() => {
 *     loader.loadAsync('/models/character.glb').then(setGltf)
 *   }, [loader])
 *
 *   if (!gltf) return null
 *   return <primitive object={gltf.scene} />
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With loading state
 * function Model({ url }: { url: string }) {
 *   const loader = useGLTFLoader()
 *   const [gltf, setGltf] = useState<GLTF | null>(null)
 *   const [error, setError] = useState<Error | null>(null)
 *
 *   useEffect(() => {
 *     let cancelled = false
 *
 *     loader.loadAsync(url)
 *       .then(result => { if (!cancelled) setGltf(result) })
 *       .catch(err => { if (!cancelled) setError(err) })
 *
 *     return () => { cancelled = true }
 *   }, [loader, url])
 *
 *   if (error) return <ErrorFallback error={error} />
 *   if (!gltf) return <LoadingPlaceholder />
 *   return <primitive object={gltf.scene} />
 * }
 * ```
 */
export function useGLTFLoader(): GLTFLoader {
  const gl = useThree((state) => state.gl)

  return useMemo(() => {
    return createGLTFLoader(gl)
  }, [gl])
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Dispose the singleton Draco and KTX2 loaders.
 *
 * Call this when completely done with GLTF loading (e.g., app shutdown).
 * In most cases, you don't need to call this as the loaders are lightweight
 * and reused across the application.
 *
 * @example
 * ```tsx
 * // On app cleanup
 * useEffect(() => {
 *   return () => disposeLoaders()
 * }, [])
 * ```
 */
export function disposeLoaders(): void {
  if (dracoLoader) {
    dracoLoader.dispose()
    dracoLoader = null
  }

  if (ktx2Loader) {
    ktx2Loader.dispose()
    ktx2Loader = null
  }

  ktx2RendererDetected = null
}

// ============================================================================
// Type Re-exports for Convenience
// ============================================================================

export type { GLTF }
