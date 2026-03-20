import { client } from './client'
import { readToken } from './env'

/**
 * Sanity client with read token — server only
 * Supports draft content and visual editing
 */
export const serverClient = client.withConfig({
  token: readToken,
  useCdn: false,
})
