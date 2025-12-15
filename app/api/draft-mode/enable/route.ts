import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { client } from '~/lib/lib/integrations/sanity/client'
import { privateToken } from '~/lib/lib/integrations/sanity/env'

export const { GET } = defineEnableDraftMode({
  client: client.withConfig({ token: privateToken }),
})
