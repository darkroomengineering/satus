import { client } from './client'
import { readToken } from './env'

/**
 * Sanity client with read token — server only
 * null if Sanity is not configured
 */
export const serverClient = client
  ? client.withConfig({
      token: readToken,
      useCdn: false,
    })
  : null
