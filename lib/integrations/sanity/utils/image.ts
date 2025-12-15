import createImageUrlBuilder from '@sanity/image-url'
import { dataset, projectId } from '../env'

const builder = createImageUrlBuilder({
  projectId,
  dataset,
})

export const urlForImage = (source: Parameters<typeof builder.image>[0]) => {
  return builder.image(source)
}
