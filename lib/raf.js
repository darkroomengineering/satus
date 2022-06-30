import { nanoid } from 'nanoid'

class Raf {
  #isClient
  #callbacks

  constructor() {
    this.#isClient = typeof window !== 'undefined'

    this.#callbacks = []
    this.now = this.#isClient ? performance.now() : 0
    if (this.#isClient) {
      requestAnimationFrame(this.#raf)
    }
  }

  add(callback, priority = 0) {
    const id = nanoid()

    this.#callbacks.push({ id, callback, priority })
    this.#callbacks.sort((a, b) => a.priority - b.priority)

    return id
  }

  remove(id) {
    const index = this.#callbacks.findIndex((callback) => id === callback.id)
    this.#callbacks.splice(index, 1)
  }

  #raf = (now) => {
    requestAnimationFrame(this.#raf)

    const deltaTime = now - this.now
    this.now = now

    this.#callbacks.forEach(({ callback }) => {
      callback(now, deltaTime)
    })
  }
}

const raf = new Raf()
export { raf }
