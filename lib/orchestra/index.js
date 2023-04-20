import { del, get, set } from 'idb-keyval'
import { broadcast } from 'lib/zustand-broadcast'
import { useEffect } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { GridDebugger } from './grid'
import s from './orchestra.module.scss'
import { Stats } from './stats'

// https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md
const storage = {
  getItem: async (name) => {
    // console.log(name, 'has been retrieved')
    return (await get(name)) || null
  },
  setItem: async (name, value) => {
    // console.log(name, 'with value', value, 'has been saved')
    await set(name, value)
  },
  removeItem: async (name) => {
    // console.log(name, 'has been deleted')
    await del(name)
  },
}

export const useOrchestra = create(
  persist(
    () => ({
      theatreList: {},
      stats: false,
      grid: false,
    }),
    {
      name: 'orchestra',
      storage: createJSONStorage(() => storage),
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
    useOrchestra.setState({
      theatreList: {},
    })
  }, [])

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
