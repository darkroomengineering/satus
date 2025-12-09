import { NextResponse } from 'next/server'
import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { client } from '~/integrations/sanity/client'
import { privateToken } from '~/integrations/sanity/env'

export const { GET } = client
  ? defineEnableDraftMode({
      client: client.withConfig({ token: privateToken }),
    })
  : {
      GET: () =>
        NextResponse.json(
          { error: 'Sanity is not configured' },
          { status: 500 }
        ),
    }
