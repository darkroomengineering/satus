# Utils

Pure utility functions organized by concern. Import from the module directly (`@/utils/math`, `@/utils/fetch`).

## Modules

| Module       | Functions                                                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `math`       | `clamp`, `lerp`, `mapRange`, `truncate`, `modulo`, `distance`                                                                                                                                                 |
| `raf`        | `mutate` (DOM write batching, prevents layout thrashing)                                                                                                                                                      |
| `fetch`      | `fetchWithTimeout`, `fetchJSON`                                                                                                                                                                               |
| `strings`    | `stripHtmlTags`                                                                                                                                                                                               |
| `metadata`   | `generatePageMetadata`, `generateSanityMetadata`                                                                                                                                                              |
| `validation` | `emailSchema`, `phoneSchema`, `sanityEnvSchema`, `shopifyEnvSchema`, `hubspotEnvSchema`, `mailchimpEnvSchema`, `turnstileEnvSchema`, `analyticsEnvSchema`, `coreEnvSchema`, `parseFormData`, `zodToValidator` |
| `rate-limit` | `rateLimit`, `getClientIP`, `rateLimiters`                                                                                                                                                                    |

Two argument orders are unusual: `clamp(min, value, max)` and `mapRange(inMin, inMax, value, outMin, outMax, shouldClamp?)`. `fetchWithTimeout` defaults to a 10s timeout.

### Validation (`validation.ts`)

| Export           | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| `emailSchema`    | Zod 4 `z.email()` validator                                        |
| `phoneSchema`    | E.164 phone number regex validator                                 |
| `*EnvSchema`     | One per integration, plus `coreEnvSchema` (BASE_URL)               |
| `parseFormData`  | Parse FormData against a Zod schema, returns `FormState` on error  |
| `zodToValidator` | Bridge Zod schemas to form hook's `(string) => boolean` validators |

### Rate Limit (`rate-limit.ts`)

In-memory rate limiter for server actions and API routes.

| Export         | Description                                                                      |
| -------------- | -------------------------------------------------------------------------------- |
| `rateLimit`    | Check if request should be rate limited                                          |
| `getClientIP`  | Extract client IP from request headers                                           |
| `rateLimiters` | Pre-configured limits: `strict` (5/min), `standard` (20/min), `relaxed` (60/min) |
