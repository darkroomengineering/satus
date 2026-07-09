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

// Guard against double-registration on module re-evaluation (HMR, duplicate
// chunks) — without this a re-eval would stack a second 'storage' listener
// that's never removed.
const REGISTERED_KEY = Symbol.for('satus.orchestra.storage')
const registry = globalThis as unknown as Record<symbol, unknown>
if (typeof window !== 'undefined' && !registry[REGISTERED_KEY]) {
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey) {
      Orchestra.persist.rehydrate()
    }
  })
  registry[REGISTERED_KEY] = true
}

export default Orchestra
