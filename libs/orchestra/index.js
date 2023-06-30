import { del, get, set } from 'idb-keyval'
import { Studio } from 'libs/theatre/studio'
import { broadcast } from 'libs/zustand-broadcast'
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
      studio: false,
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

const useStore = create((set) => ({
  visible: true,
  setVisible: (visible) => set({ visible }),
}))

// to be added to main pages
export function Orchestra() {
  const visible = useStore(({ visible }) => visible)

  const { studio, stats, grid } = useOrchestra(
    ({ studio, stats, grid }) => ({ studio, stats, grid }),
    shallow
  )

  return (
    visible && (
      <>
        {studio && <Studio />}
        {stats && <Stats />}
        {grid && <GridDebugger />}
      </>
    )
  )
}

// to be added to debug pages
export function OrchestraToggle() {
  const setVisible = useStore(({ setVisible }) => setVisible)

  useEffect(() => {
    setVisible(false)
  }, [])

  return (
    <div className={s.orchestra}>
      <button
        onClick={() => {
          useOrchestra.setState(({ studio }) => ({ studio: !studio }))
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
