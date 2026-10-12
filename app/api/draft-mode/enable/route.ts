import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { NextResponse } from 'next/server'

import { isConfigured } from '@/integrations/registry'
import { client } from '@/integrations/sanity/client'
import { env } from '@/lib/env'

const token = env.SANITY_API_READ_TOKEN

// Draft mode needs the Viewer token: without it `sanityFetch` can't read
// drafts, and `defineEnableDraftMode` can't validate Presentation's preview
// secret. Fail with a clear error instead of a confusing downstream 401/403.
const draftModeHandler =
  isConfigured('sanity') && client && token
    ? defineEnableDraftMode({
        client: client.withConfig({ token }),
      })
    : {
        GET: () =>
          NextResponse.json(
            {
              data: null,
              error:
                isConfigured('sanity') && client
                  ? 'Draft mode requires SANITY_API_READ_TOKEN to be set'
                  : 'Sanity is not configured',
            },
            { status: 503 }
          ),
      }

export const { GET } = draftModeHandler
