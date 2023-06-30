import { del, get, set } from 'idb-keyval'
// import { Studio } from 'libs/theatre/studio'
import { broadcast } from 'libs/zustand-broadcast'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import s from './orchestra.module.scss'

const Studio = dynamic(
  () => import('libs/theatre/studio').then(({ Studio }) => Studio),
  { ssr: false }
)
const Stats = dynamic(() => import('./stats').then(({ Stats }) => Stats), {
  ssr: false,
})
const GridDebugger = dynamic(
  () => import('./grid').then(({ GridDebugger }) => GridDebugger),
  {
    ssr: false,
  }
)

// avoid to display debug tools on orchestra page
const useInternalStore = create((set) => ({
  isVisible: true,
  setIsVisible: (isVisible) => set({ isVisible }),
}))

// https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md
const INDEXEDDB_STORAGE = {
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

export const useOrchestraStore = create(
  persist(
    () => ({
      studio: false,
      stats: false,
      grid: false,
    }),
    {
      name: 'orchestra',
      storage: createJSONStorage(() => INDEXEDDB_STORAGE),
    }
  )
)

broadcast(useOrchestraStore, 'orchestra')

export function Orchestra() {
  const isVisible = useInternalStore(({ isVisible }) => isVisible)

  const { studio, stats, grid } = useOrchestraStore(
    ({ studio, stats, grid }) => ({ studio, stats, grid }),
    shallow
  )

  return (
    isVisible && (
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
  useEffect(() => {
    useInternalStore.setState(() => ({
      isVisible: false,
    }))
  }, [])

  return (
    <div className={s.orchestra}>
      <button
        onClick={() => {
          useOrchestraStore.setState(({ studio }) => ({ studio: !studio }))
        }}
      >
        ⚙️
      </button>
      <button
        onClick={() => {
          useOrchestraStore.setState(({ stats }) => ({ stats: !stats }))
        }}
      >
        📈
      </button>
      <button
        onClick={() => {
          useOrchestraStore.setState(({ grid }) => ({ grid: !grid }))
        }}
      >
        🌐
      </button>
    </div>
  )
}
