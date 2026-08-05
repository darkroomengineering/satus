import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { NextResponse } from 'next/server'

import { isConfigured } from '@/integrations/registry'
import { client } from '@/integrations/sanity/client'
import { privateToken } from '@/integrations/sanity/env'

// Draft mode genuinely requires the private token — client.fetch has no
// perspective:'drafts' access without one. Fail with a clear error instead
// of letting `defineEnableDraftMode` hit a confusing downstream 401/403.
const draftModeHandler =
  isConfigured('sanity') && client && privateToken !== ''
    ? defineEnableDraftMode({
        client: client.withConfig({ token: privateToken }),
      })
    : {
        GET: () =>
          NextResponse.json(
            {
              error:
                isConfigured('sanity') && client
                  ? 'Draft mode requires SANITY_PRIVATE_TOKEN (or SANITY_API_WRITE_TOKEN) to be set'
                  : 'Sanity is not configured',
            },
            { status: 503 }
          ),
      }

export const { GET } = draftModeHandler
