import { createClient } from 'next-sanity'
import { isSanityConfigured } from '../check-integration'
import { apiVersion, dataset, privateToken, projectId, studioUrl } from './env'

export const client = isSanityConfigured()
  ? createClient({
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
  : null
