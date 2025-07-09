import { createClient } from '@sanity/client'
import { apiVersion, dataset, projectId } from '~/sanity/env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  token: process.env.SANITY_VIEWER_TOKEN,
  stega: {
    studioUrl: process.env.NEXT_PUBLIC_SANITY_STUDIO_URL,
  },
})

// Client with authentication for writing
export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
  stega: {
    enabled: false,
  },
})
