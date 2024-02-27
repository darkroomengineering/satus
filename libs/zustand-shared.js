export function shared(store, id = 'zustand-broadcast') {
  if ('BroadcastChannel' in globalThis) {
    let justReceived = false
    const channel = new BroadcastChannel(id)

    channel.onmessage = ({ data: state }) => {
      justReceived = true
      store.setState(JSON.parse(state))
      justReceived = false
    }

    store.subscribe((state) => {
      if (justReceived === false) {
        channel.postMessage(JSON.stringify(state))
      }
    })
  }

  return store
}
