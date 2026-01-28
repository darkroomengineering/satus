/**
 * WebGL Context Loss Handler
 *
 * WebGL context loss is common on mobile devices and happens when:
 * - Device runs low on GPU memory
 * - User switches apps (mobile)
 * - System goes to sleep
 * - GPU driver crashes
 *
 * Proper handling is CRITICAL for mobile stability. Without it,
 * users see a black screen with no recovery path.
 *
 * @see https://www.khronos.org/webgl/wiki/HandlingContextLost
 */

export type ContextLossCallbacks = {
  /** Called when WebGL context is lost. Pause rendering here. */
  onContextLost?: () => void
  /** Called when WebGL context is restored. Reload resources here. */
  onContextRestored?: () => void
}

export type ContextLossHandler = {
  /** Remove event listeners and clean up */
  cleanup: () => void
}

/**
 * Creates a WebGL context loss handler for a canvas element.
 *
 * This is critical for mobile stability where context loss is common.
 * The handler:
 * 1. Prevents default on contextlost (allows restoration)
 * 2. Logs warnings in development
 * 3. Calls your callbacks to pause/restore rendering
 *
 * @example
 * ```tsx
 * // In a React component
 * useEffect(() => {
 *   if (!canvasRef.current) return
 *
 *   const handler = createContextLossHandler(canvasRef.current, {
 *     onContextLost: () => {
 *       console.warn('WebGL context lost - pausing rendering')
 *       setContextLost(true)
 *     },
 *     onContextRestored: () => {
 *       console.info('WebGL context restored - resuming')
 *       setContextLost(false)
 *       // Re-upload textures, recompile shaders, etc.
 *     },
 *   })
 *
 *   return handler.cleanup
 * }, [])
 * ```
 *
 * @example
 * ```tsx
 * // Minimal usage - just log warnings
 * const handler = createContextLossHandler(canvas)
 * // ... later
 * handler.cleanup()
 * ```
 *
 * @param canvas - The canvas element to monitor
 * @param callbacks - Optional callbacks for context loss/restore events
 * @returns Handler object with cleanup function
 */
export function createContextLossHandler(
  canvas: HTMLCanvasElement,
  callbacks?: ContextLossCallbacks
): ContextLossHandler {
  const handleContextLost = (event: Event) => {
    // CRITICAL: Prevent default to allow context restoration
    event.preventDefault()

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[WebGL] Context lost. This is common on mobile devices.\n' +
          'The browser will attempt to restore the context automatically.'
      )
    }

    callbacks?.onContextLost?.()
  }

  const handleContextRestored = () => {
    if (process.env.NODE_ENV === 'development') {
      console.info(
        '[WebGL] Context restored. You may need to reload textures and recompile shaders.'
      )
    }

    callbacks?.onContextRestored?.()
  }

  canvas.addEventListener('webglcontextlost', handleContextLost)
  canvas.addEventListener('webglcontextrestored', handleContextRestored)

  return {
    cleanup: () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
    },
  }
}

/**
 * Simulates WebGL context loss for testing.
 *
 * Use this during development to test your context loss handling.
 * Only works if the WEBGL_lose_context extension is available.
 *
 * @example
 * ```tsx
 * // Add a debug button in development
 * {process.env.NODE_ENV === 'development' && (
 *   <button onClick={() => simulateContextLoss(gl)}>
 *     Simulate Context Loss
 *   </button>
 * )}
 * ```
 *
 * @param gl - WebGL rendering context
 * @param restoreAfterMs - Time in ms before restoring context (default: 3000)
 */
export function simulateContextLoss(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  restoreAfterMs = 3000
): void {
  const extension = gl.getExtension('WEBGL_lose_context')

  if (!extension) {
    console.warn(
      '[WebGL] WEBGL_lose_context extension not available. Cannot simulate context loss.'
    )
    return
  }

  console.info('[WebGL] Simulating context loss...')
  extension.loseContext()

  setTimeout(() => {
    console.info('[WebGL] Restoring context...')
    extension.restoreContext()
  }, restoreAfterMs)
}
