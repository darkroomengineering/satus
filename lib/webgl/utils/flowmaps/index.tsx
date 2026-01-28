import { useFrame, useThree } from '@react-three/fiber'
import { types } from '@theatre/core'
import { useRef } from 'react'
import type { WebGLRenderer } from 'three'
import { useCurrentSheet } from '@/dev/theatre'
import { useTheatre } from '@/dev/theatre/hooks/use-theatre'
import { Flowmap } from '@/webgl/utils/flowmaps/flowmap-sim'

/**
 * Check if the renderer is WebGPU (NodeMaterial-based)
 * Note: Flowmap simulation currently only works with WebGL.
 * WebGPU would require compute shaders for proper ping-pong texture support.
 */
function isWebGPURenderer(gl: WebGLRenderer): boolean {
  return (
    'isWebGPURenderer' in gl &&
    (gl as unknown as { isWebGPURenderer: boolean }).isWebGPURenderer
  )
}

/**
 * Stub flowmap for WebGPU - provides compatible interface but no-ops
 * Exported for type compatibility in components that use flowmaps
 */
export class FlowmapStub {
  uniform = { value: null }
  falloff = 0
  dissipation = 0
  update() {
    // No-op for WebGPU stub
  }
}

export function useFlowmapSim() {
  const sheet = useCurrentSheet()
  const gl = useThree((state) => state.gl)

  // Use ref to ensure flowmap is only created once
  const flowmapRef = useRef<Flowmap | FlowmapStub | null>(null)
  if (!flowmapRef.current) {
    // Skip flowmap for WebGPU - would require compute shaders for proper support
    if (isWebGPURenderer(gl)) {
      console.info(
        '[Flowmap] Disabled for WebGPU renderer (requires compute shaders)'
      )
      flowmapRef.current = new FlowmapStub()
    } else {
      flowmapRef.current = new Flowmap(gl, { size: 128 })
    }
  }
  const flowmap = flowmapRef.current

  useTheatre(
    sheet,
    'flowmap',
    {
      falloff: types.number(0.2, { range: [0, 1], nudgeMultiplier: 0.01 }),
      dissipation: types.number(0.98, { range: [0, 1], nudgeMultiplier: 0.01 }),
    },
    {
      onValuesChange: ({
        falloff,
        dissipation,
      }: {
        falloff: number
        dissipation: number
      }) => {
        flowmap.falloff = falloff
        flowmap.dissipation = dissipation
      },
      deps: [flowmap],
    }
  )

  useFrame(() => {
    flowmap.update()
  }, -10)

  return flowmap
}
