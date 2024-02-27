import { useEffect, useState } from 'react'

// avoid to display debug tools on orchestra page
let isOrchestraPage = false

let useOrchestraStore = create(
  persist(() => ({}), {
    name: 'orchestra',
    storage: createJSONStorage(() => localStorage),
  }),
)

useOrchestraStore = shared(useOrchestraStore, 'orchestra')

export function useOrchestra() {
  const values = useOrchestraStore()

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(!isOrchestraPage)
  }, [])

  return isVisible && values
}

// to be added to debug pages
export function OrchestraToggle({ children, title, id }) {
  isOrchestraPage = true

  return (
    <button
      onClick={() => {
        useOrchestraStore.setState((state) => ({ [id]: !state[id] }))
      }}
      title={title}
      style={{ fontSize: '64px' }}
    >
      {children}
    </button>
  )
}
