import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { client } from '~/integrations/sanity'

export const { GET } = defineEnableDraftMode({
  client: client.withConfig({
    token: process.env.SANITY_API_WRITE_TOKEN,
  }),
})
