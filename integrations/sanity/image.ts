import { createImageUrlBuilder } from "@sanity/image-url";
import { env } from "@/env";

const builder = createImageUrlBuilder({
  projectId: env.PUBLIC_SANITY_PROJECT_ID!,
  dataset: env.PUBLIC_SANITY_DATASET || "production",
});

export function urlForImage(source: Parameters<typeof builder.image>[0]) {
  return builder.image(source);
}
