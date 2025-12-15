import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { client } from '~/lib/integrations/sanity/client'
import { privateToken } from '~/lib/integrations/sanity/env'

export const { GET } = defineEnableDraftMode({
  client: client.withConfig({ token: privateToken }),
})
