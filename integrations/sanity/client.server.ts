import { client } from './client'
import { readToken } from './env'

export const serverClient = client.withConfig({
  token: readToken,
  useCdn: false,
})
