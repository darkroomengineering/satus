/**
 * WebGL / React Three Fiber Utilities
 *
 * Import from barrel:
 *   import { Canvas, WebGLTunnel } from '~/webgl'
 */

// Components
export { Canvas, CanvasContext, useCanvas } from './components/canvas'
export {
  FlowmapContext,
  FlowmapProvider,
  useFlowmap,
} from './components/flowmap-provider'
export { Image as WebGLImage } from './components/image'
export { PostProcessing } from './components/postprocessing'
export { Preload } from './components/preload'
export { RAF } from './components/raf'
export { DOMTunnel, WebGLTunnel } from './components/tunnel'

// Hooks
export { useWebGLRect } from './hooks/use-webgl-rect'

// Utils
export { useFlowmapSim } from './utils/flowmaps'
export { Flowmap } from './utils/flowmaps/flowmap-sim'
export { useFluidSim } from './utils/fluid'
export { Fluid } from './utils/fluid/fluid-sim'
