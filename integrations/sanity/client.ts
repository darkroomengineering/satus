import { createClient } from "@sanity/client";
import { env } from "@/env";

export const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET || "production",
  apiVersion: env.PUBLIC_SANITY_API_VERSION || "2025-10-30",
  useCdn: true,
  stega: {
    studioUrl: env.PUBLIC_SANITY_STUDIO_URL || "http://localhost:5173/studio",
  },
});
