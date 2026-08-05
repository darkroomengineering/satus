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
   *
   * Opt-in, and every public form action in this starter opts in. It is not
   * on by default because `validateTurnstile` rejects a request that carries
   * no token at all, and this starter ships no widget component — a default
   * of `true` would break any form a project writes with this helper until
   * they wire Cloudflare's script themselves. Turn it on for anything
   * reachable by an anonymous visitor.
   */
  turnstile?: boolean
  /** Business logic to run after validation succeeds. */
  run: (input: T) => Promise<FormState>
}

/**
 * Shared server-action helper that handles:
 * 1. IP extraction from `x-forwarded-for`
 * 2. Rate limiting (configurable; defaults to standard limiter, 20 req/min)
 * 3. Turnstile verification (opt in with `turnstile: true`)
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
  turnstile = false,
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
