import { types } from '@theatre/core'
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

export function Group({
  children,
  theatreKey,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
}: GroupProps) {
  const groupRef = useRef<ThreeGroup>(null!)

  const sheet = useCurrentSheet()

  useTheatre(
    sheet,
    theatreKey,
    {
      position: {
        x: types.number(position[0], { nudgeMultiplier: 0.01 }),
        y: types.number(position[1], { nudgeMultiplier: 0.01 }),
        z: types.number(position[2], { nudgeMultiplier: 0.01 }),
      },
      rotation: {
        x: types.number(rotation[0], { nudgeMultiplier: 0.01 }),
        y: types.number(rotation[1], { nudgeMultiplier: 0.01 }),
        z: types.number(rotation[2], { nudgeMultiplier: 0.01 }),
      },
      scale: {
        x: types.number(scale[0], { nudgeMultiplier: 0.01 }),
        y: types.number(scale[1], { nudgeMultiplier: 0.01 }),
        z: types.number(scale[2], { nudgeMultiplier: 0.01 }),
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
