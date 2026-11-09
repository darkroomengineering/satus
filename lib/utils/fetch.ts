import type { z } from 'zod'

import { type JsonValue, parseApiResponse } from './validation'

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number // Timeout in milliseconds (default: 10000ms)
}

/**
 * Fetch with a deadline that also covers reading the body: the signal stays
 * attached to the response, so a body that stalls after the headers arrive
 * rejects too. Rejects with a `TimeoutError` DOMException once `timeout` ms
 * pass, or with the external signal's reason when it aborts first.
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 10000, signal: externalSignal, ...fetchOptions } = options
  const timeoutSignal = AbortSignal.timeout(timeout)

  return fetch(url, {
    ...fetchOptions,
    signal: externalSignal
      ? AbortSignal.any([externalSignal, timeoutSignal])
      : timeoutSignal,
  })
}

/**
 * Without a schema returns `JsonValue` the caller must narrow; with one,
 * throws a descriptive error if the shape doesn't match.
 */
export async function fetchJSON(
  url: string,
  options?: FetchWithTimeoutOptions
): Promise<JsonValue>
export async function fetchJSON<T>(
  url: string,
  options: FetchWithTimeoutOptions,
  schema: z.ZodType<T>
): Promise<T>
export async function fetchJSON<T>(
  url: string,
  options: FetchWithTimeoutOptions = {},
  schema?: z.ZodType<T>
): Promise<T | JsonValue> {
  const response = await fetchWithTimeout(url, options)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const json: JsonValue = await response.json()

  if (schema) {
    return parseApiResponse(schema, json)
  }

  return json
}
