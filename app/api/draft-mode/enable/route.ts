import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { client } from '~/integrations/sanity/client'
import { privateToken } from '~/integrations/sanity/env'

export const { GET } = defineEnableDraftMode({
  client: client.withConfig({ token: privateToken }),
})
