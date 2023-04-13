import { GridDebugger } from 'components/orchestra/grid'
import { Stats } from 'components/orchestra/stats'
import { broadcast } from 'lib/zustand-broadcast'
import { useEffect } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import s from './orchestra.module.scss'

export const useOrchestra = create(
  persist(
    () => ({
      theatreList: {},
      stats: false,
      grid: false,
    }),
    {
      name: 'orchestra',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

broadcast(useOrchestra, 'orchestra')

// to be added to main pages
export function Orchestra() {
  const { stats, grid } = useOrchestra(
    ({ stats, grid }) => ({ stats, grid }),
    shallow
  )

  useEffect(() => {
    window.addEventListener(
      'click',
      () => {
        window.open('/_debug/orchestra', '_blank')
      },
      { once: true }
    )
  }, [])

  return (
    <>
      {stats && <Stats />}
      {grid && <GridDebugger />}
    </>
  )
}

// to be added to debug pages
export function OrchestraToggle() {
  return (
    <div className={s.orchestra}>
      <button
        onClick={() => {
          window.open('/_debug/theatre', null, {})
        }}
      >
        ⚙️
      </button>
      <button
        onClick={() => {
          useOrchestra.setState(({ stats }) => ({ stats: !stats }))
        }}
      >
        📈
      </button>
      <button
        onClick={() => {
          useOrchestra.setState(({ grid }) => ({ grid: !grid }))
        }}
      >
        🌐
      </button>
    </div>
  )
}
