# Integrations

Third-party service integrations. All are optional—remove unused ones with `bun run setup:project`.

### Validation

All integrations use Zod schemas for environment variable validation. The integration registry (`lib/integrations/registry.ts`) is the single source of truth:

```ts
import { isConfigured } from '@/integrations/registry'

if (isConfigured('sanity')) {
  // Sanity env vars are valid
}
```

Typed environment access is available via:

```ts
import { env } from '@/lib/env'
const domain = env.SHOPIFY_STORE_DOMAIN // string | undefined with IntelliSense
```

## Available Integrations

| Integration                      | Purpose         | Documentation                                                                        |
| -------------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| [Sanity](sanity/README.md)       | Headless CMS    | Visual editing, content management. Env vars: see `sanity/README.md`.                |
| [Shopify](shopify/README.md)     | E-commerce      | Cart, products, checkout. Env vars: see `shopify/README.md`.                         |
| [HubSpot](hubspot/README.md)     | Forms           | Marketing forms, CRM. Env vars: see `hubspot/README.md`.                             |
| [Mailchimp](mailchimp/README.md) | Newsletter      | Email subscriptions. Env vars: see `mailchimp/README.md`.                            |
| [Turnstile](turnstile/README.md) | Spam protection | Cloudflare Turnstile CAPTCHA for form actions¹. Env vars: see `turnstile/README.md`. |

¹ Turnstile ships with every preset, including Blank — it has no `INTEGRATION_BUNDLES` entry, so `setup:project`'s `--keep`/`--preset` selection can't strip it. Remove it by deleting `lib/integrations/turnstile` and the form wiring that imports it, then run `bun run check`.

## Quick Usage

```tsx
// Sanity
import { sanityFetch } from '@/integrations/sanity/live'
import { RichText } from '@/integrations/sanity/components/rich-text'
const { data } = await sanityFetch({ query: pageQuery })

// Shopify
import { Cart } from '@/integrations/shopify/cart'
import { AddToCart } from '@/integrations/shopify/cart/add-to-cart'
;<Cart>
  <AddToCart product={product} />
</Cart>

// HubSpot
import { EmbedHubspotForm } from '@/integrations/hubspot/embed'
;<EmbedHubspotForm formId="your-form-id" />

// Mailchimp
import { mailchimpSubscriptionAction } from '@/integrations/mailchimp'
;<Form action={mailchimpSubscriptionAction}>...</Form>
```

## Removing Integrations

Run `bun run setup:project` for interactive removal. It is also drivable non-interactively (CI): `--preset <key>` or `--keep <id,id,...>` selects the integration set, `--yes` confirms it, `--clean-homepage` swaps in a blank starter homepage, and `--skip-install` skips the lockfile update. Keeping an integration also keeps whatever it requires (e.g. keeping `theatre` keeps `webgl`). When setup completes it removes its own machinery from the project (the setup script and its test suite) — `generate`, `doctor`, `dev`, and `handoff` stay; `generate`, `doctor`, and `prepare-handoff` keep using the shared bundle machinery.

Turnstile is not part of this automated flow — it has no bundle for `setup:project` to remove, so it ships regardless of preset or `--keep` selection.

`setup:project --keep <ids> --yes` is the only supported removal path for Sanity and Shopify: both own routes under `app/api`, `app/(site)`, and `app/studio`, plus config transforms, so deleting their directories by hand leaves the build broken. Run `bun run setup:project --keep <ids> --yes` (or the interactive form), then `bun run check`.

## Adding a New Integration

1. Create a Zod env schema in `lib/utils/validation.ts`
2. Add an entry to `lib/integrations/registry.ts` (env schema, capabilities, `cspSources`). `lib/integrations/csp.ts` composes the enforced CSP from `cspSources` — a missing declaration means the integration's remote scripts, images, or requests get blocked in production.
3. Create `lib/integrations/<name>/` and add its env vars to `lib/env.ts` (and `.env.example` if they are required to boot)
4. Add an `INTEGRATION_BUNDLES` entry in `lib/scripts/integration-bundles.ts` (files, deps, transforms, env stubs) so `setup:project` can strip it
5. Create `lib/integrations/<name>/README.md` and add a row to AGENTS.md § Documentation Map
