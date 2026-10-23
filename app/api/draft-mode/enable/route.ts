import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { NextResponse } from 'next/server'

import { isConfigured } from '@/integrations/registry'
import { client } from '@/integrations/sanity/client'
import { env } from '@/lib/env'

const token = env.SANITY_API_READ_TOKEN

// Draft mode needs the Viewer token (`sanityFetch` reads drafts with it,
// `defineEnableDraftMode` validates the preview secret with it). Fail with a
// clear error instead of a downstream 401/403.
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
