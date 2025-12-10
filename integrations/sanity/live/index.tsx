import { defineLive } from 'next-sanity/live'
import { client } from '../client'
import { privateToken, publicToken } from '../env'

let _sanityLive: ReturnType<typeof defineLive> | null = null

function getSanityLive() {
  if (!client) {
    console.error('Sanity is not configured')
    return null
  }

  if (!_sanityLive) {
    _sanityLive = defineLive({
      client,
      browserToken: publicToken,
      serverToken: privateToken,
    })
  }

  return _sanityLive
}

const sanityLiveInstance = getSanityLive()

type SanityLiveInstance = NonNullable<typeof sanityLiveInstance>
type SanityFetchFunction = SanityLiveInstance['sanityFetch']

export const sanityFetch: SanityFetchFunction = ((...args) => {
  if (!sanityLiveInstance?.sanityFetch) {
    throw new Error(
      'Sanity is not configured. Please check your environment variables.'
    )
  }
  return sanityLiveInstance.sanityFetch(...args)
}) as SanityFetchFunction

export const SanityLive = sanityLiveInstance?.SanityLive || (() => null)
