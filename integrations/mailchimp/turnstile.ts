/**
 * Cloudflare Turnstile - Better than reCAPTCHA
 * - Completely invisible to users
 * - Faster verification
 * - More privacy-friendly
 * - Perfect for terminal aesthetics
 */

import { fetchWithTimeout } from '~/libs/fetch-with-timeout'

export interface TurnstileValidationResult {
  isValid: boolean
  errors: string[]
}

export async function validateTurnstile(
  token: string
): Promise<TurnstileValidationResult> {
  if (!token) {
    return {
      isValid: false,
      errors: ['security_verification_required_'],
    }
  }

  try {
    const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY
    if (!secret) {
      console.warn('CLOUDFLARE_TURNSTILE_SECRET_KEY not found')
      return { isValid: true, errors: [] } // Fail open in development
    }

    const response = await fetchWithTimeout(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret,
          response: token,
        }),
        timeout: 5000, // 5 second timeout for Turnstile verification
      }
    )

    if (!response.ok) {
      return {
        isValid: false,
        errors: ['security_verification_failed_'],
      }
    }

    const data = (await response.json()) as {
      success: boolean
      'error-codes'?: string[]
    }

    if (data.success) {
      return { isValid: true, errors: [] }
    }
    return {
      isValid: false,
      errors: ['access_denied_'],
    }
  } catch (error) {
    console.error('Turnstile validation error:', error)
    return {
      isValid: false,
      errors: ['connection_error_'],
    }
  }
}

export async function validateFormWithTurnstile(formData: FormData): Promise<{
  isValid: boolean
  errors: string[]
}> {
  const turnstileToken = formData.get('cf-turnstile-response')?.toString() || ''

  // In development (localhost), gracefully skip Turnstile validation
  const isLocalhost =
    process.env.NODE_ENV === 'development' ||
    !process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY.includes('localhost')

  if (isLocalhost) {
    console.log('🔧 Development mode: Skipping Turnstile validation')
    return { isValid: true, errors: [] }
  }

  if (!turnstileToken) {
    return {
      isValid: false,
      errors: ['security_verification_required_'],
    }
  }

  return await validateTurnstile(turnstileToken)
}
