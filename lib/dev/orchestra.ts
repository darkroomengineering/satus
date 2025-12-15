import {
  createJSONStorage,
  persist,
  subscribeWithSelector,
} from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'

type OrchestraState = Record<string, boolean>

const storageKey = 'orchestra'
const Orchestra = createStore<OrchestraState>()(
  persist(
    subscribeWithSelector(() => ({}) as OrchestraState),
    {
      name: storageKey,
      storage: createJSONStorage(() => localStorage),
    }
  )
)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey) {
      Orchestra.persist.rehydrate()
    }
  })
}

export default Orchestra
