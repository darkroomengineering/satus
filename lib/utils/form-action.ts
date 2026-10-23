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
  schema: z.ZodType<T>
  formData: FormData
  /** Defaults to `'rate_limit_exceeded_'`. */
  rateLimitMessage?: string
  /** Defaults to the standard limiter (20 req/min); use `rateLimiters.strict` for login-like endpoints. */
  rateLimiter?: RateLimitConfig
  /**
   * Verify the `cf-turnstile-response` field via Cloudflare Turnstile. Opt-in,
   * and every public form action in this starter opts in. Not the default
   * because `validateTurnstile` rejects a request with no token at all and this
   * starter ships no widget component: a default of `true` would break any
   * form a project writes with this helper until they wire Cloudflare's
   * script. Turn it on for anything reachable by an anonymous visitor.
   */
  turnstile?: boolean
  /** Runs after validation succeeds. */
  run: (input: T) => Promise<FormState>
}

/**
 * Shared server-action pipeline: rate limit, optional Turnstile, Zod
 * validation via `parseFormData`, then `run`.
 *
 * Rate limiting runs before Turnstile: the in-memory counter is nearly free,
 * while Turnstile verification makes an outbound POST to Cloudflare's
 * siteverify with a multi-second timeout. Gating the expensive call behind the
 * cheap check means a flood is rejected before any request can hold a
 * serverless invocation open waiting on Cloudflare.
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

  // No IP header: skip rate limiting rather than bucket every headerless
  // visitor under one shared counter.
  if (ip) {
    const rateLimitResult = rateLimit(`${rateLimitPrefix}:${ip}`, rateLimiter)

    if (!rateLimitResult.success) {
      return {
        status: 429,
        message: rateLimitMessage,
      }
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
