'use client'

import Elastica, {
  AxisAlignedBoundaryBox,
  initalConditionsPresets,
  updatePresets,
} from '@darkroom.engineering/elastica/react'
import s from './example.module.scss'

export function Example1() {
  return (
    <section className={s.example}>
      <Elastica
        showHashGrid
        config={{
          gridSize: 3,
          collisions: true,
          borders: 'rigid',
        }}
        initialCondition={initalConditionsPresets.random}
        update={updatePresets.dvdScreenSaver}
      >
        {[{ name: 'DVD' }].map(({ name }, index) => (
          <AxisAlignedBoundaryBox key={index} className={s.item}>
            {name}
          </AxisAlignedBoundaryBox>
        ))}
      </Elastica>
    </section>
  )
}
