import { loadQuery as _loadQuery, setServerClient } from '@sanity/react-loader'
import { getServerClient } from './client.server'

let initialized = false

function ensureInitialized() {
  if (!initialized) {
    setServerClient(getServerClient())
    initialized = true
  }
}

export function loadQuery<T>(
  ...args: Parameters<typeof _loadQuery<T>>
): ReturnType<typeof _loadQuery<T>> {
  ensureInitialized()
  return _loadQuery<T>(...args)
}
