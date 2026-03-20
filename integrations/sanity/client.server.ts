import type { SanityClient } from '@sanity/client'
import { getClient } from './client'
import { readToken } from './env'

let _serverClient: SanityClient | null = null

/**
 * Sanity client with read token — server only
 * Lazily created to avoid crashing when env vars are missing
 */
export function getServerClient(): SanityClient {
  if (!_serverClient) {
    _serverClient = getClient().withConfig({
      token: readToken,
      useCdn: false,
    })
  }
  return _serverClient
}
