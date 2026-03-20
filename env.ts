import { createEnv } from "@t3-oss/env-core";
import * as v from "valibot";

export const env = createEnv({
  clientPrefix: "PUBLIC_",

  client: {
    PUBLIC_BASE_URL: v.string(),

    // Sanity
    PUBLIC_SANITY_PROJECT_ID: v.string(),
    PUBLIC_SANITY_DATASET: v.string(),
    PUBLIC_SANITY_API_VERSION: v.string(),
    PUBLIC_SANITY_STUDIO_URL: v.string(),

    // HubSpot
    // PUBLIC_HUBSPOT_PORTAL_ID: v.string(),

    // Turnstile
    // PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: v.string(),

    // Analytics
    // PUBLIC_GOOGLE_ANALYTICS: v.string(),
    // PUBLIC_GOOGLE_TAG_MANAGER_ID: v.string(),
  },

  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
