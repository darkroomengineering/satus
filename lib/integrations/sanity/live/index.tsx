import { defineLive } from 'next-sanity/live'
import { client } from '../client'
import { privateToken, publicToken } from '../env'

export const { sanityFetch, SanityLive } = defineLive({
  client,
  browserToken: publicToken,
  serverToken: privateToken,
})
