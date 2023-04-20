import EventEmitter from 'events'
import { useCallback, useEffect, useState } from 'react'

export function useBroadcastChannel(id = 'default') {
  const [channel, setChannel] = useState()
  const [events] = useState(new EventEmitter())

  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(id)
      setChannel(channel)

      return () => {
        channel.closed = true
        channel.close()
        setChannel(undefined)
      }
    }
  }, [id])

  useEffect(() => {
    if (channel) {
      channel.onmessage = ({ data }) => {
        data = JSON.parse(data)
        events.emit(data.command, data)
      }
    }
  }, [channel])

  const on = useCallback((command, callback) => {
    if (callback) {
      events.on(command, callback)
    }
  }, [])

  const off = useCallback((command, callback) => {
    if (callback) {
      events.off(command, callback)
    }
  }, [])

  const emit = useCallback(
    (command, data = {}) => {
      if (channel && !channel.closed) {
        data.command = command
        channel?.postMessage(JSON.stringify(data))
        events.emit(command, data)
      }
    },
    [channel]
  )

  return { on, off, emit }
}
