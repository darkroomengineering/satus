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

// Guards against stacking a second 'storage' listener when the module
// re-evaluates (HMR, duplicate chunks). Must be a `globalThis` flag: a
// module-scope variable resets on re-evaluation.
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
