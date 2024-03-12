// import { create } from 'zustand'
import {
  createJSONStorage,
  persist,
  subscribeWithSelector,
} from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'

const storageKey = 'orchestra'
const store = createStore(
  persist(
    subscribeWithSelector(() => ({})),
    {
      name: storageKey,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey) {
      store.persist.rehydrate()
    }
  })
}

class Toggle {
  constructor(id, content) {
    this.id = id
    this.content = content
    this.domElement = document.createElement('button')
    this.domElement.innerText = content
    this.domElement.title = id
    this.domElement.style.fontSize = '64px'
    this.domElement.addEventListener('click', this.onToggle, false)
    this.unsubscribeStore = store.subscribe(
      ({ [this.id]: value }) => value,
      (value) => {
        this.domElement.dataset.active = value
      },
      {
        fireImmediately: true,
      },
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
  constructor() {
    this.domElement = document.createElement('div')

    this.toggles = []
  }

  subscribe(callback) {
    return store.subscribe(callback, { fireImmediately: true })
  }

  add(id, content) {
    if (this.toggles.find((toggle) => toggle.id === id)) return this

    const toggle = new Toggle(id, content)
    this.toggles.push(toggle)
    this.domElement.appendChild(toggle.domElement)

    return this
  }

  remove(id) {
    const toggle = this.toggles.find((toggle) => toggle.id === id)
    // this.domElement.removeChild(toggle.domElement)
    toggle.destroy()
    this.toggles = this.toggles.filter((toggle) => toggle.id !== id)

    return this
  }
}

const isClient = typeof window !== 'undefined'

export default isClient && new Orchestra()

// To be added to debug page
// Orchestra.add('studio', '⚙️').add('stats', '📈').add('grid', '🌐').add('dev', '🚧')
// Orchestra.add('stats', '📈')
// Orchestra.add('grid', '🌐')
// Orchestra.add('dev', '🚧')
// document.body.appendChild(Orchestra.domElement)
