/**
 * Fetch utilities with timeout protection for external API calls.
 */

import type { z } from 'zod'
import { parseApiResponse } from './validation'

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number // Timeout in milliseconds (default: 10000ms)
}

/** Fetch with automatic timeout; throws AbortError if timeout is reached. */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 10000, signal: externalSignal, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort())
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch and parse JSON with timeout protection.
 *
 * Without a schema, returns `Promise<unknown>` — the caller must narrow the type.
 *
 * @example
 * ```ts
 * // Unvalidated — returns unknown, caller must narrow
 * const raw = await fetchJSON('https://api.example.com/data')
 *
 * // Validated — throws a descriptive error if the shape doesn't match
 * import { z } from 'zod'
 * const UserSchema = z.object({ name: z.string() })
 * const user = await fetchJSON('https://api.example.com/user', {}, UserSchema)
 * //    ^? { name: string }
 * ```
 */
export async function fetchJSON(
  url: string,
  options?: FetchWithTimeoutOptions
): Promise<unknown>
export async function fetchJSON<T>(
  url: string,
  options: FetchWithTimeoutOptions,
  schema: z.ZodType<T>
): Promise<T>
export async function fetchJSON<T>(
  url: string,
  options: FetchWithTimeoutOptions = {},
  schema?: z.ZodType<T>
): Promise<unknown> {
  const response = await fetchWithTimeout(url, options)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const json: unknown = await response.json()

  if (schema) {
    return parseApiResponse(schema, json)
  }

  return json
}
