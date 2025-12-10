import { createClient } from 'next-sanity'
import { isSanityConfigured } from '../check-integration'
import { apiVersion, dataset, privateToken, projectId, studioUrl } from './env'

let _client: ReturnType<typeof createClient> | null = null

export function getClient() {
  if (!isSanityConfigured()) {
    console.error('Sanity is not configured')
    return null
  }

  if (!_client) {
    _client = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
      perspective: 'published',
      token: privateToken,
      stega: {
        studioUrl,
        filter: (props) => {
          if (props.sourcePath.at(-1) === 'title') {
            return true
          }
          return props.filterDefault(props)
        },
      },
    })
  }

  return _client
}

export const client = getClient()
