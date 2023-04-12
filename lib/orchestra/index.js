import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { broadcast } from '../zustand-broadcast'
import s from './orchestra.module.scss'

export const useOrchestra = create(
  persist(
    (set, get) => ({
      count: 1,
      gridIsVisible: false,
      toggleGridIsVisible: () => set({ gridIsVisible: !get().gridIsVisible }),
    }),
    {
      name: 'orchestra', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
)

broadcast(useOrchestra, 'orchestra')

const GridDebugger = dynamic(
  () =>
    import('components/grid-debugger').then(({ GridDebugger }) => GridDebugger),
  { ssr: false }
)

export function Orchestra({ children }) {
  const [isGui, setIsGui] = useState(false)

  useEffect(() => {
    const isGui = document.location.search.includes('debug=1')
    setIsGui(isGui)

    if (!isGui) {
      window.addEventListener(
        'click',
        () => {
          window.open('/?debug=1', null, {})
        },
        { once: true }
      )
    }
  }, [])

  // const count = useStore(({ count }) => count)
  const isGridVisible = useOrchestra(({ gridIsVisible }) => gridIsVisible)
  const toggleGridIsVisible = useOrchestra(
    ({ toggleGridIsVisible }) => toggleGridIsVisible
  )

  return (
    <>
      {isGui ? (
        <div className={s.orchestra}>
          <button className={s.icon} onClick={toggleGridIsVisible}>
            🌐
          </button>
        </div>
      ) : (
        <>
          {children}
          <GridDebugger isVisible={isGridVisible} />
        </>
      )}
    </>
  )
}
