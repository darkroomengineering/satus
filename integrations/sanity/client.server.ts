import { client } from './client'

export const serverClient = client.withConfig({
  token: process.env.SANITY_API_READ_TOKEN || '',
  useCdn: false,
})
