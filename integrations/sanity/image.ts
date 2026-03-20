import { createImageUrlBuilder } from '@sanity/image-url'
import { dataset, projectId } from './env'

export function urlForImage(
  source: Parameters<ReturnType<typeof createImageUrlBuilder>['image']>[0]
) {
  const builder = createImageUrlBuilder({
    projectId: projectId!,
    dataset: dataset!,
  })
  return builder.image(source)
}
