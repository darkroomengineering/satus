import {
  createImageUrlBuilder,
  type SanityImageSource,
} from '@sanity/image-url'
import { dataset, projectId } from '../env'

const builder = projectId ? createImageUrlBuilder({ projectId, dataset }) : null

export const urlForImage = (source: SanityImageSource) => {
  if (!builder) {
    throw new Error(
      'Sanity image builder not configured — missing NEXT_PUBLIC_SANITY_PROJECT_ID'
    )
  }
  return builder.image(source)
}
