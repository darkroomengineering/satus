import { del, get, set } from 'idb-keyval'
// import { Studio } from 'libs/theatre/studio'
import { broadcast } from 'libs/zustand-broadcast'
import { createContext, useContext, useEffect } from 'react'
import { createJSONStorage, persist } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { createWithEqualityFn } from 'zustand/traditional'
import s from './orchestra.module.scss'

// avoid to display debug tools on orchestra page
const useInternalStore = createWithEqualityFn(
  (set) => ({
    isVisible: true,
    setIsVisible: (isVisible) => set({ isVisible }),
  }),
  shallow,
)

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

export const useOrchestraStore = createWithEqualityFn(
  persist(() => ({}), {
    name: 'orchestra',
    storage: createJSONStorage(() => INDEXEDDB_STORAGE),
  }),
  shallow,
)

broadcast(useOrchestraStore, 'orchestra')

export const OrchestraContext = createContext({})

export function useOrchestra() {
  return useContext(OrchestraContext)
}

// add around the app
export function Orchestra({ children }) {
  const isVisible = useInternalStore(({ isVisible }) => isVisible)

  const value = useOrchestraStore((value) => value, shallow)

  return (
    <>
      <OrchestraContext.Provider value={value}>
        {children(isVisible ? value : {})}
      </OrchestraContext.Provider>
    </>
  )
}

export function OrchestraToggle({ icon, title, id }) {
  // useEffect(() => {
  //   useOrchestraStore.setState((state) => {
  //     const clone = { ...state }
  //     clone[id] = defaultValue
  //     return clone
  //   })
  // }, [defaultValue])

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
  useEffect(() => {
    useInternalStore.setState(() => ({
      isVisible: false,
    }))
  }, [])

  return <div className={s.orchestra}>{children}</div>
}
