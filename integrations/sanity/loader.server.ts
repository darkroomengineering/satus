import { loadQuery as _loadQuery, setServerClient } from '@sanity/react-loader'
import { serverClient } from './client.server'

let initialized = false

export function loadQuery<T>(
  ...args: Parameters<typeof _loadQuery<T>>
): ReturnType<typeof _loadQuery<T>> {
  if (!initialized && serverClient) {
    setServerClient(serverClient)
    initialized = true
  }
  return _loadQuery<T>(...args)
}
