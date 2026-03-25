import { createEnv } from "@t3-oss/env-core";
import * as v from "valibot";

export const env = createEnv({
  server: {
    NODE_ENV: v.picklist(["development", "production", "test"]),

    // Sanity
    SANITY_API_READ_TOKEN: v.string(),

    // Shopify
    // SHOPIFY_STORE_DOMAIN: v.string(),
    // SHOPIFY_STOREFRONT_ACCESS_TOKEN: v.string(),
    // SHOPIFY_REVALIDATION_SECRET: v.string(),

    // HubSpot
    // HUBSPOT_ACCESS_TOKEN: v.string(),

    // Mailchimp
    // MAILCHIMP_API_KEY: v.string(),
    // MAILCHIMP_SERVER_PREFIX: v.string(),
    // MAILCHIMP_AUDIENCE_ID: v.string(),

    // Turnstile
    // CLOUDFLARE_TURNSTILE_SECRET_KEY: v.string(),

    // Password protection (optional)
    SITE_PASSWORD: v.optional(v.string()),
    SESSION_SECRET: v.optional(v.string()),
  },

  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
