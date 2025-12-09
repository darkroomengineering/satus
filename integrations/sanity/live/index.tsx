import { defineLive } from 'next-sanity/live'
import { client } from '../client'
import { privateToken, publicToken } from '../env'

export const { sanityFetch, SanityLive } = client
  ? defineLive({
      client,
      browserToken: publicToken,
      serverToken: privateToken,
    })
  : {
      sanityFetch: () =>
        Promise.resolve({
          data: null,
          error: new Error('Sanity is not configured'),
        }),
      SanityLive: () => null,
    }
