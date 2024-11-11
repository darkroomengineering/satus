import {
  createJSONStorage,
  persist,
  subscribeWithSelector,
} from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'

const storageKey = 'orchestra'
const store = createStore<Record<string, boolean>>()(
  persist(
    subscribeWithSelector(() => ({
      webgl: true,
    })),
    {
      name: storageKey,
      storage: createJSONStorage(() => localStorage),
    }
  )
)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey) {
      store.persist.rehydrate()
    }
  })
}

class Toggle {
  id: string
  domElement: HTMLButtonElement
  private unsubscribeStore: () => void
  constructor(id: string, content: string) {
    this.id = id
    this.domElement = document.createElement('button')
    this.domElement.innerText = content
    this.domElement.title = id
    this.domElement.style.fontSize = '64px'
    this.domElement.addEventListener('click', this.onToggle, false)
    this.unsubscribeStore = store.subscribe(
      ({ [this.id]: value }) => value,
      (value) => {
        this.domElement.dataset.active = String(value)
      },
      {
        fireImmediately: true,
      }
    )
  }

  onToggle = () => {
    store.setState((state) => ({ [this.id]: !state[this.id] }))
  }

  destroy() {
    this.domElement.removeEventListener('click', this.onToggle, false)
    this.unsubscribeStore()
    this.domElement.remove()
  }
}

class Orchestra {
  private domElement: HTMLDivElement
  toggles: Toggle[]
  constructor() {
    this.domElement = document.createElement('div')
    this.store = store
    this.toggles = []
  }

  subscribe(callback: (value: Record<string, boolean>) => void) {
    return store.subscribe((s) => s, callback, { fireImmediately: true })
  }

  add(id: string, content: string) {
    if (this.toggles.find((toggle) => toggle.id === id)) return this

    const toggle = new Toggle(id, content)
    this.toggles.push(toggle)
    this.domElement.appendChild(toggle.domElement)

    return this
  }

  remove(id: string) {
    const toggle = this.toggles.find((toggle) => toggle.id === id)
    // this.domElement.removeChild(toggle.domElement)
    toggle?.destroy()
    this.toggles = this.toggles.filter((toggle) => toggle.id !== id)

    return this
  }
}

const isClient = typeof window !== 'undefined'

const orchestra = isClient ? new Orchestra() : null

export default orchestra

// To be added to debug page
// Orchestra.add('studio', '⚙️').add('stats', '📈').add('grid', '🌐').add('dev', '🚧')
// Orchestra.add('stats', '📈')
// Orchestra.add('grid', '🌐')
// Orchestra.add('dev', '🚧')
// document.body.appendChild(Orchestra.domElement)
