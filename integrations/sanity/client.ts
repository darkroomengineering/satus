import { createClient } from '@sanity/client'
import { apiVersion, dataset, projectId } from '~/sanity/env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Use CDN for better performance
  token: process.env.SANITY_API_WRITE_TOKEN, // Keep write token for editing capabilities
  stega: {
    studioUrl: process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || '/studio',
  },
})
