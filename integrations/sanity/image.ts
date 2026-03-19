import imageUrlBuilder from '@sanity/image-url'
import { client } from './client'

const builder = imageUrlBuilder(client)

export function urlForImage(source: Parameters<typeof builder.image>[0]) {
  return builder.image(source)
}
