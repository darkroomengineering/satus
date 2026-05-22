import { headers } from 'next/headers'
import type { z } from 'zod'
import type { FormState } from '@/components/ui/form/types'
import { rateLimit, rateLimiters } from '@/lib/utils/rate-limit'
import { parseFormData } from '@/lib/utils/validation'

interface RunFormActionOptions<T> {
  /** Rate-limit key prefix (e.g. "mailchimp-contact"). The client IP is appended. */
  rateLimitPrefix: string
  /** Zod schema to validate the FormData against. */
  schema: z.ZodType<T>
  /** The raw FormData from the server action. */
  formData: FormData
  /**
   * Message returned when the rate limit is exceeded.
   * Defaults to `'rate_limit_exceeded_'`.
   */
  rateLimitMessage?: string
  /** Business logic to run after validation succeeds. */
  run: (input: T) => Promise<FormState>
}

/**
 * Shared server-action helper that handles:
 * 1. IP extraction from `x-forwarded-for`
 * 2. Rate limiting (standard limiter, 20 req/min)
 * 3. Zod schema validation via `parseFormData`
 * 4. Delegation to the provided `run` callback
 *
 * Turnstile verification is intentionally NOT included here — keep it in the
 * action body, before calling this helper, since different integrations may
 * use different verifier modules.
 */
export async function runFormAction<T>({
  rateLimitPrefix,
  schema,
  formData,
  rateLimitMessage = 'rate_limit_exceeded_',
  run,
}: RunFormActionOptions<T>): Promise<FormState> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  const rateLimitResult = rateLimit(
    `${rateLimitPrefix}:${ip}`,
    rateLimiters.standard
  )

  if (!rateLimitResult.success) {
    return {
      status: 429,
      message: rateLimitMessage,
    }
  }

  const parsed = parseFormData(schema, formData)

  if (!('success' in parsed)) {
    return parsed
  }

  return run(parsed.data)
}
