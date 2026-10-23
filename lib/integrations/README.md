# Integrations

Third-party service integrations, all optional. The registry (`lib/integrations/registry.ts`) is the single source of truth: each entry carries a Zod env schema, and `isConfigured('<id>')` reports whether its env vars are valid. Read env through `env` from `@/lib/env`, never `process.env`.

## Available Integrations

| Integration                      | Purpose         | Documentation                                                                        |
| -------------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| [Sanity](sanity/README.md)       | Headless CMS    | Visual editing, content management. Env vars: see `sanity/README.md`.                |
| [Shopify](shopify/README.md)     | E-commerce      | Cart, products, checkout. Env vars: see `shopify/README.md`.                         |
| [HubSpot](hubspot/README.md)     | Forms           | Marketing forms, CRM. Env vars: see `hubspot/README.md`.                             |
| [Mailchimp](mailchimp/README.md) | Newsletter      | Email subscriptions. Env vars: see `mailchimp/README.md`.                            |
| [Turnstile](turnstile/README.md) | Spam protection | Cloudflare Turnstile CAPTCHA for form actions¹. Env vars: see `turnstile/README.md`. |

¹ Turnstile ships with every preset, including Blank — it has no `INTEGRATION_BUNDLES` entry, so `setup:project`'s `--keep`/`--preset` selection can't strip it. Remove it by deleting `lib/integrations/turnstile` and the form wiring that imports it, then run `bun run check`.

## Removing Integrations

Run `bun run setup:project` for interactive removal. Non-interactive (CI): `--preset <key>` or `--keep <id,id,...>` selects the integration set, `--yes` confirms it, `--clean-homepage` swaps in a blank starter homepage, and `--skip-install` skips the lockfile update. Keeping an integration also keeps whatever it requires (e.g. keeping `theatre` keeps `webgl`). When setup completes it removes its own machinery (the setup script and its test suite); `doctor`, `dev`, and `handoff` stay, and `doctor` and `prepare-handoff` keep using the shared bundle machinery.

`setup:project --keep <ids> --yes` is the only supported removal path for Sanity and Shopify: both own routes under `app/api`, `app/(site)`, and `app/studio`, plus config transforms, so deleting their directories by hand leaves the build broken. Run `bun run check` afterwards.

## Adding a New Integration

1. Create a Zod env schema in `lib/utils/validation.ts`
2. Add an entry to `lib/integrations/registry.ts` (env schema, capabilities, `cspSources`). `lib/integrations/csp.ts` composes the enforced CSP from `cspSources`; a missing declaration means the integration's remote scripts, images, or requests get blocked in production.
3. Create `lib/integrations/<name>/` and add its env vars to `lib/env.ts` (and `.env.example` if they are required to boot)
4. Add an `INTEGRATION_BUNDLES` entry in `lib/scripts/integration-bundles.ts` (files, deps, package.json scripts, transforms, env stubs) so `setup:project` can strip it
5. Create `lib/integrations/<name>/README.md` and add a row to AGENTS.md § Documentation Map
