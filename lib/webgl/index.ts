/**
 * WebGL / React Three Fiber Utilities
 *
 * Import from barrel:
 *   import { Canvas, WebGLTunnel, GlobalCanvas } from '~/webgl'
 *
 * ## Architecture
 *
 * The WebGL system uses a lazy GlobalCanvas pattern:
 * - **GlobalCanvas**: Persistent WebGL context mounted at layout level
 * - **Canvas**: Activates GlobalCanvas and provides tunnel context for pages
 * - **WebGLTunnel**: Portals 3D content into the GlobalCanvas
 *
 * Benefits:
 * - No WebGL context recreation on navigation
 * - Seamless route transitions
 * - Shared textures/assets across routes
 * - CSS visibility + RAF pausing for zero overhead when inactive
 * - Zero overhead for non-WebGL pages (lazy initialization)
 */

// Components
export { Canvas, CanvasContext, useCanvas } from './components/canvas'
export {
  FlowmapContext,
  FlowmapProvider,
  useFlowmap,
} from './components/flowmap-provider'
export { GlobalCanvas, LazyGlobalCanvas } from './components/global-canvas'
export { Image as WebGLImage } from './components/image'
export { PostProcessing } from './components/postprocessing'
export { Preload } from './components/preload'
export { RAF } from './components/raf'
export { DOMTunnel, WebGLTunnel } from './components/tunnel'
// Hooks
export { useWebGLElement } from './hooks/use-webgl-element'
export { useWebGLRect } from './hooks/use-webgl-rect'
// Store
export { useWebGLStore } from './store'

// Utils
export { useFlowmapSim } from './utils/flowmaps'
export { Flowmap } from './utils/flowmaps/flowmap-sim'
export { useFluidSim } from './utils/fluid'
export { Fluid } from './utils/fluid/fluid-sim'
