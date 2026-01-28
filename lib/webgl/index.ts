/**
 * WebGL Utilities and Components
 *
 * This module provides Three.js/R3F utilities for the Satus starter template.
 *
 * @example
 * ```tsx
 * // Import individual utilities
 * import { useDisposable, disposeObject } from '@/lib/webgl'
 * import { PerfMonitor } from '@/lib/webgl'
 * import { createContextLossHandler } from '@/lib/webgl'
 *
 * // Or import from specific paths for tree-shaking
 * import { useDisposable } from '@/lib/webgl/hooks/use-disposable'
 * ```
 */

// ============================================================================
// Resource Disposal
// ============================================================================

export {
  /**
   * Recursively disposes an Object3D and all its children (geometries, materials, textures).
   * Handles ImageBitmap cleanup for GLTF models.
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   const gltf = await loadGLTF('/model.glb')
   *   return () => disposeObject(gltf.scene)
   * }, [])
   * ```
   */
  disposeObject,
  /**
   * Disposes a WebGLRenderTarget and its textures.
   */
  disposeRenderTarget,
  /**
   * Disposes a texture and its source (handles ImageBitmap cleanup for GLTF).
   */
  disposeTexture,
  /**
   * Hook for automatic disposal of Three.js resources (geometries, materials, textures).
   * Resources are disposed when component unmounts or dependencies change.
   *
   * @example
   * ```tsx
   * const geometry = useDisposable(() => new BoxGeometry(1, 1, 1), [])
   * const material = useDisposable(() => new MeshBasicMaterial({ color }), [color])
   * ```
   */
  useDisposable,
  /**
   * Hook for managing multiple disposable resources as a group.
   *
   * @example
   * ```tsx
   * const { add } = useDisposableGroup()
   * const geo = add(new BoxGeometry(1, 1, 1))
   * const mat = add(new MeshBasicMaterial())
   * // Both disposed on unmount
   * ```
   */
  useDisposableGroup,
} from './hooks/use-disposable'

// ============================================================================
// Context Loss Handling
// ============================================================================

export {
  type ContextLossCallbacks,
  type ContextLossHandler,
  /**
   * Creates a WebGL context loss handler for a canvas.
   * Critical for mobile stability where context loss is common.
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   const handler = createContextLossHandler(canvas, {
   *     onContextLost: () => setContextLost(true),
   *     onContextRestored: () => setContextLost(false),
   *   })
   *   return handler.cleanup
   * }, [])
   * ```
   */
  createContextLossHandler,
  /**
   * Simulates WebGL context loss for testing.
   * Only works if WEBGL_lose_context extension is available.
   */
  simulateContextLoss,
} from './utils/context-loss-handler'

// ============================================================================
// Performance Monitoring
// ============================================================================

export {
  /**
   * Development-only performance monitor component.
   * Tracks renderer.info stats and warns about memory leaks.
   *
   * @example
   * ```tsx
   * <Canvas>
   *   <PerfMonitor />
   *   <YourScene />
   * </Canvas>
   * ```
   */
  PerfMonitor,
  type PerfMonitorProps,
  type PerfStats,
  /**
   * Hook to access renderer stats on demand.
   *
   * @example
   * ```tsx
   * const getStats = usePerfStats()
   * console.log(getStats())
   * ```
   */
  usePerfStats,
} from './components/perf-monitor'

// ============================================================================
// Core Components (re-exports for convenience)
// ============================================================================

export { GlobalCanvas, LazyGlobalCanvas } from './components/global-canvas'
export { useWebGLElement } from './hooks/use-webgl-element'
export { useWebGLRect } from './hooks/use-webgl-rect'
export { useWebGLStore } from './store'

// ============================================================================
// Renderer Utilities
// ============================================================================

export {
  type CreateRendererOptions,
  createRenderer,
  createWebGLRenderer,
  type RendererResult,
  type RendererType,
} from './utils/create-renderer'

export {
  detectGPUCapability,
  type GPUCapability,
  getRecommendedPrecision,
  isWebGPUAvailable,
  type ShaderPrecision,
} from './utils/gpu-detection'

// ============================================================================
// Texture Cache
// ============================================================================

export {
  type CachedTextureOptions,
  /**
   * Clear and dispose all textures from the cache.
   * Call on scene cleanup or major transitions.
   */
  clearTextureCache,
  /**
   * Remove and dispose a specific texture from the cache.
   */
  disposeTextureFromCache,
  /**
   * Get the number of cached textures (for debugging).
   */
  getTextureCacheSize,
  /**
   * Check if a texture is already cached.
   */
  isTextureCached,
  /**
   * Load a texture with caching support.
   * Returns cached instance if already loaded.
   *
   * Per Three.js Tip 40: Reuse textures across materials
   * to reduce memory usage.
   *
   * @example
   * ```tsx
   * const texture = await loadCachedTexture('/hero.jpg')
   * const texture2 = await loadCachedTexture('/hero.jpg') // Same instance
   * ```
   */
  loadCachedTexture,
  /**
   * React hook for loading cached textures.
   * Handles loading state automatically.
   *
   * @example
   * ```tsx
   * const texture = useTextureCached('/hero.jpg')
   * if (!texture) return <Loading />
   * ```
   */
  useTextureCached,
} from './utils/texture-cache'

// ============================================================================
// Asset Loaders (Draco/KTX2)
// ============================================================================

export {
  /**
   * Create a configured GLTFLoader with Draco and KTX2 support.
   * Use for non-React contexts or explicit control.
   *
   * Draco reduces geometry by 90-95%, KTX2 reduces VRAM ~10x.
   *
   * @example
   * ```tsx
   * const loader = createGLTFLoader(renderer)
   * const gltf = await loader.loadAsync('/model.glb')
   * ```
   */
  createGLTFLoader,
  /**
   * Dispose singleton Draco/KTX2 loaders.
   * Usually not needed as loaders are lightweight and reused.
   */
  disposeLoaders,
  type GLTF,
  /**
   * Load a GLTF/GLB with Draco and KTX2 support.
   * Simplest way to load optimized 3D models.
   *
   * @example
   * ```tsx
   * const gltf = await loadGLTF('/model.glb')
   * scene.add(gltf.scene)
   * ```
   */
  loadGLTF,
  /**
   * React hook returning a configured GLTFLoader.
   * Must be inside R3F Canvas context.
   *
   * @example
   * ```tsx
   * const loader = useGLTFLoader()
   * const gltf = await loader.loadAsync('/model.glb')
   * ```
   */
  useGLTFLoader,
} from './utils/loaders'

// ============================================================================
// TSL (Three Shader Language) - EXPERIMENTAL
// ============================================================================
// TSL compiles to WGSL (WebGPU) or GLSL (WebGL) automatically.
// Use for unified shaders that work with both renderers.
// See /lib/webgl/docs/tsl-migration.md for migration guide.

export {
  type AnimatedColorMaterialOptions,
  type AnimatedMaterialHandle,
  /**
   * Creates an animated color material using TSL.
   * Oscillates between two colors over time.
   *
   * EXPERIMENTAL: TSL APIs may change with Three.js updates.
   *
   * @example
   * ```tsx
   * const { material, speedUniform } = createAnimatedColorMaterial({
   *   colorA: '#ff0000',
   *   colorB: '#0000ff',
   *   speed: 2.0,
   * })
   * ```
   */
  createAnimatedColorMaterial,
  /**
   * Creates an FBM (fractal Brownian motion) noise node.
   * TSL equivalent of GLSL fbm() in noise.ts.
   *
   * EXPERIMENTAL: TSL APIs may change with Three.js updates.
   */
  createFBMNoiseNode,
  /**
   * Creates a noise-based material using MaterialX noise functions.
   * Works on both WebGPU and WebGL renderers.
   *
   * EXPERIMENTAL: TSL APIs may change with Three.js updates.
   *
   * @example
   * ```tsx
   * const { material } = createNoiseMaterial({
   *   baseColor: '#3366ff',
   *   scale: 2.0,
   *   octaves: 4,
   * })
   * ```
   */
  createNoiseMaterial,
  /**
   * Creates a Perlin noise node using MaterialX.
   * TSL equivalent of GLSL perlin_3d() in noise.ts.
   *
   * EXPERIMENTAL: TSL APIs may change with Three.js updates.
   */
  createPerlinNoiseNode,
  /**
   * Creates a textured material using TSL with UV manipulation.
   *
   * EXPERIMENTAL: TSL APIs may change with Three.js updates.
   */
  createTSLTextureMaterial,
  type NoiseMaterialHandle,
  type NoiseMaterialOptions,
  type TSLTextureMaterialOptions,
} from './utils/tsl'
