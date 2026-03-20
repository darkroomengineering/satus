import { createImageUrlBuilder } from '@sanity/image-url'
import { dataset, projectId } from './env'

export function urlForImage(
  source: Parameters<ReturnType<typeof createImageUrlBuilder>['image']>[0]
) {
  return createImageUrlBuilder({
    projectId: projectId!,
    dataset: dataset!,
  }).image(source)
}
