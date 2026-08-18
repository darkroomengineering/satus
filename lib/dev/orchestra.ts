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
    subscribeWithSelector((): OrchestraState => ({})),
    {
      name: storageKey,
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// Guard against double-registration on module re-evaluation (HMR, duplicate
// chunks) — without this a re-eval would stack a second 'storage' listener
// that's never removed. A `globalThis` flag (rather than a module-scope
// variable) is what actually survives re-evaluation, since a fresh module
// instance would otherwise reset a plain variable back to its initial value.
declare global {
  var __satusOrchestraStorageRegistered: boolean | undefined
}

if (
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- SSR guard; literal typeof enables bundler dead-code elimination
  typeof window !== 'undefined' &&
  !globalThis.__satusOrchestraStorageRegistered
) {
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey) {
      void Orchestra.persist.rehydrate()
    }
  })
  globalThis.__satusOrchestraStorageRegistered = true
}

export default Orchestra
