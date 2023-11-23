import { shared } from 'libs/zustand-shared'
// import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'

const ID = 'orchestra'
let store = createStore(
  persist(() => ({}), {
    name: ID,
    storage: createJSONStorage(() => localStorage),
  }),
)

store = shared(store, ID)

class Toggle {
  constructor(id, content) {
    this.id = id
    this.content = content
    this.domElement = document.createElement('button')
    this.domElement.innerText = content
    this.domElement.title = id
    this.domElement.style.fontSize = '64px'
    this.domElement.addEventListener('click', this.onToggle, false)
  }

  onToggle = () => {
    store.setState((state) => ({ ...state, [this.id]: !state[this.id] }))
  }

  destroy() {
    this.domElement.removeEventListener('click', this.onToggle, false)
    this.domElement.remove()
  }
}

class Orchestra {
  constructor() {
    this.domElement = document.createElement('div')

    this.isDebug = false
    this.toggles = []
  }

  get state() {
    return !this.isDebug && store.getState()
  }

  subscribe(callback) {
    if (!this.isDebug) store.subscribe(callback)
  }

  add(id, content) {
    // check if already exists
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
// Orchestra.isDebug = true
// Orchestra.add('studio', '⚙️')
// Orchestra.add('stats', '📈')
// Orchestra.add('grid', '🌐')
// Orchestra.add('dev', '🚧')
// document.body.appendChild(Orchestra.domElement)
