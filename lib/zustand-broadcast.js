function filterObject(object, filter) {
  const array = Object.entries(object)
  const filtered = array.filter(([key, value]) => filter(value, key))
  return Object.fromEntries(filtered)
}

export function broadcast(store, id = 'zustand-broadcast') {
  if ('BroadcastChannel' in globalThis) {
    let justReceived = false
    const channel = new BroadcastChannel(id)

    channel.onmessage = ({ data: state }) => {
      justReceived = true
      store.setState(state)
      justReceived = false
    }

    store.subscribe((state) => {
      if (justReceived === false) {
        channel.postMessage(filterObject(state, (v) => typeof v !== 'function'))
      }
    })
  }
}
