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
  isWebGPUAvailable,
} from './utils/gpu-detection'
