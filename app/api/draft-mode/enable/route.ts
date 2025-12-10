import { NextResponse } from 'next/server'
import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { client } from '~/integrations/sanity/client'
import { privateToken } from '~/integrations/sanity/env'

function getEnableDraftMode() {
  if (!(client && privateToken)) {
    console.error('Sanity is not configured')
    return {
      GET: () =>
        NextResponse.json(
          { error: 'Sanity is not configured' },
          { status: 500 }
        ),
    }
  }

  return defineEnableDraftMode({
    client: client.withConfig({ token: privateToken }),
  })
}

export const { GET } = getEnableDraftMode()
