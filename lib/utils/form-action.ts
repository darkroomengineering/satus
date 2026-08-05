import { headers } from 'next/headers'
import type { z } from 'zod'

import { validateFormWithTurnstile } from '@/lib/integrations/turnstile'
import type { FormState } from '@/lib/types/form'
import {
  getIPFromHeaders,
  type RateLimitConfig,
  rateLimit,
  rateLimiters,
} from '@/lib/utils/rate-limit'
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
  /**
   * Rate limiter config. Defaults to the standard limiter (20 req/min).
   * Pass `rateLimiters.strict` for sensitive endpoints like login.
   */
  rateLimiter?: RateLimitConfig
  /**
   * Verify the `cf-turnstile-response` field via Cloudflare Turnstile.
   * Defaults to `true` for every public form action. Set to `false` only for
   * actions with no user-facing widget (there are none in this starter today).
   */
  turnstile?: boolean
  /** Business logic to run after validation succeeds. */
  run: (input: T) => Promise<FormState>
}

/**
 * Shared server-action helper that handles:
 * 1. IP extraction from `x-forwarded-for`
 * 2. Rate limiting (configurable; defaults to standard limiter, 20 req/min)
 * 3. Turnstile verification (`turnstile: false` opts out)
 * 4. Zod schema validation via `parseFormData`
 * 5. Delegation to the provided `run` callback
 *
 * Rate limiting runs before Turnstile: the in-memory counter is nearly free
 * to check, while Turnstile verification makes an outbound POST to
 * Cloudflare's siteverify endpoint with a multi-second timeout. Gating the
 * expensive network call behind the cheap check means a flood of requests
 * gets rejected before any of them can hold a serverless invocation open
 * waiting on Cloudflare.
 */
export async function runFormAction<T>({
  rateLimitPrefix,
  schema,
  formData,
  rateLimitMessage = 'rate_limit_exceeded_',
  rateLimiter = rateLimiters.standard,
  turnstile = true,
  run,
}: RunFormActionOptions<T>): Promise<FormState> {
  const headersList = await headers()
  const ip = getIPFromHeaders(headersList)

  const rateLimitResult = rateLimit(`${rateLimitPrefix}:${ip}`, rateLimiter)

  if (!rateLimitResult.success) {
    return {
      status: 429,
      message: rateLimitMessage,
    }
  }

  if (turnstile) {
    const turnstileValidation = await validateFormWithTurnstile(formData)
    if (!turnstileValidation.isValid) {
      return {
        status: 400,
        message: 'invalid_input_',
        fieldErrors: {
          turnstile:
            turnstileValidation.errors[0] ?? 'security_verification_required_',
        },
      }
    }
  }

  const parsed = parseFormData(schema, formData)

  if (!('success' in parsed)) {
    return parsed
  }

  return run(parsed.data)
}
