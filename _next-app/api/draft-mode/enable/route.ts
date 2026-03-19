import { NextResponse } from 'next/server'
import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { isSanityConfigured } from '@/integrations/check-integration'
import { client } from '@/integrations/sanity/client'
import { privateToken } from '@/integrations/sanity/env'

// Only enable draft mode if Sanity is configured
const draftModeHandler =
  isSanityConfigured() && client
    ? defineEnableDraftMode({
        client: client.withConfig({ token: privateToken }),
      })
    : {
        GET: () =>
          NextResponse.json(
            { error: 'Sanity is not configured' },
            { status: 503 }
          ),
      }

export const { GET } = draftModeHandler
