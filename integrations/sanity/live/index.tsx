import { defineLive } from 'next-sanity'
import { client } from '../client'
import { readToken } from '../env'

export const { sanityFetch, SanityLive } = defineLive({
  client,
  browserToken: readToken,
  serverToken: readToken,
})
