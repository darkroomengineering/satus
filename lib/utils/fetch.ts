import type { z } from 'zod'

import { type JsonValue, parseApiResponse } from './validation'

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

  const onExternalAbort = () => controller.abort()

  if (externalSignal?.aborted) {
    controller.abort()
  } else if (externalSignal) {
    externalSignal.addEventListener('abort', onExternalAbort)
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
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
