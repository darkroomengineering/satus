import { createClient } from 'next-sanity'
import { apiVersion, dataset, privateToken, projectId, studioUrl } from './env'

export const client = createClient({
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
