import { broadcast } from 'libs/zustand-broadcast'
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import s from './orchestra.module.scss'

// avoid to display debug tools on orchestra page
let isOrchestraPage = false

const useOrchestraStore = create(
  persist(() => ({}), {
    name: 'orchestra',
    storage: createJSONStorage(() => localStorage),
  }),
)

broadcast(useOrchestraStore, 'orchestra')

export function useOrchestra() {
  const values = useOrchestraStore()

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(!isOrchestraPage)
  }, [])

  return isVisible && values
}

export function OrchestraToggle({ icon, title, id }) {
  return (
    <button
      onClick={() => {
        useOrchestraStore.setState((state) => {
          const clone = { ...state }
          clone[id] = !clone[id]
          return clone
        })
      }}
      title={title}
    >
      {icon}
    </button>
  )
}

// to be added to debug pages
export function OrchestraPage({ children }) {
  isOrchestraPage = true

  return <div className={s.orchestra}>{children}</div>
}
