import { useRef } from 'react'
import type { Group as ThreeGroup } from 'three'

import { useCurrentSheet } from '.'
import { useTheatre } from './hooks/use-theatre'

type GroupProps = {
  children: React.ReactNode
  theatreKey: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
}

const DEFAULT_POSITION: [number, number, number] = [0, 0, 0]
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0]
const DEFAULT_SCALE: [number, number, number] = [1, 1, 1]

export function Group({
  children,
  theatreKey,
  position = DEFAULT_POSITION,
  rotation = DEFAULT_ROTATION,
  scale = DEFAULT_SCALE,
}: GroupProps) {
  const groupRef = useRef<ThreeGroup>(null!)

  const sheet = useCurrentSheet()

  useTheatre(
    sheet,
    theatreKey,
    {
      position: {
        x: { value: position[0], nudgeMultiplier: 0.01 },
        y: { value: position[1], nudgeMultiplier: 0.01 },
        z: { value: position[2], nudgeMultiplier: 0.01 },
      },
      rotation: {
        x: { value: rotation[0], nudgeMultiplier: 0.01 },
        y: { value: rotation[1], nudgeMultiplier: 0.01 },
        z: { value: rotation[2], nudgeMultiplier: 0.01 },
      },
      scale: {
        x: { value: scale[0], nudgeMultiplier: 0.01 },
        y: { value: scale[1], nudgeMultiplier: 0.01 },
        z: { value: scale[2], nudgeMultiplier: 0.01 },
      },
      visible: true,
    },
    {
      onValuesChange: ({ position, rotation, scale, visible }) => {
        if (!groupRef.current) return

        groupRef.current.visible = visible

        groupRef.current.position.set(position.x, position.y, position.z)
        groupRef.current.rotation.set(rotation.x, rotation.y, rotation.z)
        groupRef.current.scale.set(scale.x, scale.y, scale.z)

        groupRef.current.updateMatrix()
      },
    }
  )

  return (
    <group matrixAutoUpdate={false} ref={groupRef}>
      {children}
    </group>
  )
}
