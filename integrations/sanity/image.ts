import { createImageUrlBuilder } from '@sanity/image-url'
import { client } from './client'

const { projectId, dataset } = client.config()

const builder = createImageUrlBuilder({
  projectId: projectId!,
  dataset: dataset!,
})

export function urlForImage(source: Parameters<typeof builder.image>[0]) {
  return builder.image(source)
}
