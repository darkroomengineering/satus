# Utils

Pure utility functions organized by concern.

Use explicit imports for clarity and better tree-shaking:

```tsx
import { clamp, lerp } from '@/utils/math'
import { slugify } from '@/utils/strings'
import { fetchWithTimeout } from '@/utils/fetch'
import { generateSanityMetadata } from '@/utils/metadata'
```

## Modules

| Module | Functions |
|--------|-----------|
| `math` | `clamp`, `lerp`, `mapRange`, `truncate`, `modulo`, `roundTo`, `degToRad`, `radToDeg`, `distance` |
| `raf` | `measure`, `mutate`, `batch` (DOM batching) |
| `fetch` | `fetchWithTimeout`, `fetchJSON` |
| `strings` | `slugify`, `lowerFirstChar`, `capitalizeFirstLetter`, `isEmptyArray`, `stripHtmlTags` |
| `metadata` | `generatePageMetadata`, `generateSanityMetadata` |
| `validation` | `emailSchema`, `phoneSchema`, `sanityEnvSchema`, `shopifyEnvSchema`, `hubspotEnvSchema`, `mailchimpEnvSchema`, `turnstileEnvSchema`, `analyticsEnvSchema`, `coreEnvSchema`, `parseFormData`, `zodToValidator` |
| `rate-limit` | `rateLimit`, `getClientIP`, `rateLimiters` |

## Common Patterns

```tsx
// Math
clamp(0, value, 100)
lerp(0, 100, 0.5) // → 50
mapRange(0, 1000, scrollY, 0, 1)

// DOM batching (prevents layout thrashing)
await measure(() => element.getBoundingClientRect())
await mutate(() => element.style.transform = 'translateX(10px)')

// Fetch with timeout
const response = await fetchWithTimeout(url, { timeout: 5000 })

// SEO
export const metadata = generatePageMetadata({ title: 'About' })
```

### Validation (`validation.ts`)

Zod-based validation utilities for environment variables, form data, and shared field schemas.

| Export | Description |
|--------|-------------|
| `emailSchema` | Zod 4 `z.email()` validator |
| `phoneSchema` | E.164 phone number regex validator |
| `sanityEnvSchema` | Validates Sanity env vars |
| `shopifyEnvSchema` | Validates Shopify env vars |
| `hubspotEnvSchema` | Validates HubSpot env vars |
| `mailchimpEnvSchema` | Validates Mailchimp env vars |
| `turnstileEnvSchema` | Validates Turnstile env vars |
| `analyticsEnvSchema` | Validates Analytics env vars |
| `coreEnvSchema` | Validates core env vars (BASE_URL) |
| `parseFormData` | Parse FormData against a Zod schema, returns `FormState` on error |
| `zodToValidator` | Bridge Zod schemas to form hook's `(string) => boolean` validators |

### Rate Limit (`rate-limit.ts`)

In-memory rate limiter for server actions and API routes.

| Export | Description |
|--------|-------------|
| `rateLimit` | Check if request should be rate limited |
| `getClientIP` | Extract client IP from request headers |
| `rateLimiters` | Pre-configured limits: `strict` (5/min), `standard` (20/min), `relaxed` (60/min) |
